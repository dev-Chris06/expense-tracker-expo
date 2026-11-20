/**
 * Lecture de toute la base pour la sauvegarde, et remplacement complet
 * par une sauvegarde lors d'une restauration.
 */
import {
  BACKUP_APP,
  BACKUP_FORMAT,
  type Backup,
  type BackupCategory,
  type BackupRecurrence,
  type BackupSetting,
  type BackupTransaction,
} from "@/utils/backup";

import { getDatabase } from "./database";
import { DEVICE_SETTING_PREFIX } from "./settings";

/** Réglages propres à ce téléphone (dossier de sauvegarde…), hors sauvegarde. */
const DEVICE_LIKE = `${DEVICE_SETTING_PREFIX.replace(/_/g, "\\_")}%`;

export function readBackup(now: Date = new Date()): Backup {
  const db = getDatabase();
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    creeLe: now.toISOString(),
    categories: db.getAllSync<BackupCategory>(
      "SELECT id, nom, type, couleur, icone, masquee, position, budget FROM categories ORDER BY id",
    ),
    transactions: db.getAllSync<BackupTransaction>(
      "SELECT id, montant, categorie_id, date, note FROM transactions ORDER BY id",
    ),
    recurrences: db.getAllSync<BackupRecurrence>(
      "SELECT id, montant, categorie_id, note, jour, dernier_mois, active FROM recurrences ORDER BY id",
    ),
    settings: db.getAllSync<BackupSetting>(
      "SELECT cle, valeur FROM settings WHERE cle NOT LIKE ? ESCAPE '\\' ORDER BY cle",
      DEVICE_LIKE,
    ),
  };
}

/** Nombre d'opérations actuellement enregistrées (pour la confirmation). */
export function countTransactions(): number {
  return getDatabase().getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM transactions")?.n ?? 0;
}

/**
 * Remplace toutes les données par celles de la sauvegarde (déjà vérifiée
 * par parseBackup). Tout ou rien : en cas d'erreur, la transaction est
 * annulée et les données actuelles restent intactes.
 */
export function restoreBackup(backup: Backup): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    // Ordre imposé par les clés étrangères : d'abord ce qui pointe vers les catégories.
    db.runSync("DELETE FROM transactions");
    db.runSync("DELETE FROM recurrences");
    db.runSync("DELETE FROM categories");
    // Les réglages de ce téléphone restent ceux de ce téléphone.
    db.runSync("DELETE FROM settings WHERE cle NOT LIKE ? ESCAPE '\\'", DEVICE_LIKE);

    for (const c of backup.categories) {
      db.runSync(
        "INSERT INTO categories (id, nom, type, couleur, icone, masquee, position, budget) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        c.id,
        c.nom,
        c.type,
        c.couleur,
        c.icone,
        c.masquee,
        c.position,
        c.budget,
      );
    }
    for (const t of backup.transactions) {
      db.runSync(
        "INSERT INTO transactions (id, montant, categorie_id, date, note) VALUES (?, ?, ?, ?, ?)",
        t.id,
        t.montant,
        t.categorie_id,
        t.date,
        t.note,
      );
    }
    for (const r of backup.recurrences) {
      db.runSync(
        "INSERT INTO recurrences (id, montant, categorie_id, note, jour, dernier_mois, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        r.id,
        r.montant,
        r.categorie_id,
        r.note,
        r.jour,
        r.dernier_mois,
        r.active,
      );
    }
    for (const s of backup.settings) {
      if (s.cle.startsWith(DEVICE_SETTING_PREFIX)) continue;
      db.runSync("INSERT INTO settings (cle, valeur) VALUES (?, ?)", s.cle, s.valeur);
    }
  });
}
