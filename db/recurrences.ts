/**
 * Accès à la table "recurrences" : opérations ajoutées automatiquement
 * chaque mois (loyer, forfait, salaire…).
 *
 * Les opérations créées sont des opérations ordinaires : on peut les
 * modifier ou les supprimer une à une. Supprimer ou mettre en pause une
 * récurrence ne touche pas aux opérations déjà créées.
 */
import type { TransactionType } from "@/types/transaction";
import { todayISO } from "@/utils/dateHelpers";
import { dueDates, resumeLastMonth } from "@/utils/recurrence";

import { getDatabase } from "./database";

export interface Recurrence {
  id: number;
  montant: number;
  categorieId: number;
  note: string | null;
  /** Jour du mois, 1 à 31 */
  jour: number;
  /** Dernier mois "YYYY-MM" déjà créé */
  dernierMois: string;
  active: boolean;
  categorie: string;
  type: TransactionType;
  couleur: string;
  icone: string;
}

export type RecurrenceInput = Pick<Recurrence, "montant" | "categorieId" | "note" | "jour" | "dernierMois">;

interface RecurrenceRow extends Omit<Recurrence, "active"> {
  active: number;
}

const SELECT_RECURRENCE = `
  SELECT r.id, r.montant, r.categorie_id AS categorieId, r.note, r.jour,
         r.dernier_mois AS dernierMois, r.active,
         c.nom AS categorie, c.type, c.couleur, c.icone
  FROM recurrences r JOIN categories c ON c.id = r.categorie_id`;

const toRecurrence = (row: RecurrenceRow): Recurrence => ({ ...row, active: row.active === 1 });

/** Toutes les récurrences : actives d'abord, puis par jour du mois. */
export async function getRecurrences(): Promise<Recurrence[]> {
  const rows = await getDatabase().getAllAsync<RecurrenceRow>(
    `${SELECT_RECURRENCE} ORDER BY r.active DESC, r.jour, r.id`,
  );
  return rows.map(toRecurrence);
}

export async function countActiveRecurrences(): Promise<number> {
  const row = await getDatabase().getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM recurrences WHERE active = 1");
  return row?.n ?? 0;
}

export async function addRecurrence(input: RecurrenceInput): Promise<number> {
  const result = await getDatabase().runAsync(
    "INSERT INTO recurrences (montant, categorie_id, note, jour, dernier_mois) VALUES (?, ?, ?, ?, ?)",
    input.montant,
    input.categorieId,
    input.note,
    input.jour,
    input.dernierMois,
  );
  return result.lastInsertRowId;
}

/** Pause ou reprise. À la reprise, les mois de pause ne sont pas rattrapés. */
export async function setRecurrenceActive(recurrence: Recurrence, active: boolean, today = todayISO()): Promise<void> {
  const resumeFrom = resumeLastMonth(recurrence.jour, today);
  await getDatabase().runAsync(
    "UPDATE recurrences SET active = ?, dernier_mois = ? WHERE id = ?",
    active ? 1 : 0,
    active && resumeFrom > recurrence.dernierMois ? resumeFrom : recurrence.dernierMois,
    recurrence.id,
  );
}

export async function deleteRecurrence(id: number): Promise<void> {
  await getDatabase().runAsync("DELETE FROM recurrences WHERE id = ?", id);
}

/**
 * Crée les opérations des récurrences actives dont le jour est arrivé, et
 * retourne leur nombre. Synchrone, pour passer avant le premier affichage ;
 * tout est fait dans une transaction (pas de doublon en cas d'erreur).
 */
export function applyDueRecurrences(today = todayISO()): number {
  const db = getDatabase();
  const rows = db.getAllSync<{ id: number; montant: number; categorie_id: number; note: string | null; jour: number; dernier_mois: string }>(
    "SELECT id, montant, categorie_id, note, jour, dernier_mois FROM recurrences WHERE active = 1",
  );
  let created = 0;
  for (const r of rows) {
    const dates = dueDates(r.dernier_mois, r.jour, today);
    if (dates.length === 0) continue;
    db.withTransactionSync(() => {
      for (const date of dates) {
        db.runSync(
          "INSERT INTO transactions (montant, categorie_id, date, note) VALUES (?, ?, ?, ?)",
          r.montant,
          r.categorie_id,
          date,
          r.note,
        );
      }
      db.runSync("UPDATE recurrences SET dernier_mois = ? WHERE id = ?", dates[dates.length - 1].slice(0, 7), r.id);
    });
    created += dates.length;
  }
  return created;
}
