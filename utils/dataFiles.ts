/**
 * Sauvegarde, restauration et export CSV : écriture du fichier puis
 * partage (Drive, WhatsApp, Fichiers…), ou choix d'un fichier à restaurer.
 *
 * L'app n'envoie rien elle-même : c'est l'utilisateur qui choisit où le
 * fichier va, depuis la fenêtre de partage du téléphone.
 */
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { readBackup } from "@/db/backup";
import { recordSharedBackup } from "@/db/settings";
import { getAllTransactions } from "@/db/transactions";
import { backupFileName, type Backup, parseBackup } from "@/utils/backup";
import { buildCsv, csvFileName } from "@/utils/csv";
import { getCurrency } from "@/utils/currency";
import { todayISO } from "@/utils/dateHelpers";
import { UserFacingError } from "@/utils/errors";

async function shareText(name: string, content: string, mimeType: string, dialogTitle: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new UserFacingError("Le partage de fichiers n'est pas disponible sur ce téléphone.");
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

/** Crée la sauvegarde et ouvre la fenêtre de partage. */
export async function shareBackup(): Promise<void> {
  const backup = readBackup();
  await shareText(
    backupFileName(todayISO()),
    JSON.stringify(backup),
    "application/json",
    "Garder ma sauvegarde Dépenses Perso",
  );
  // Fenêtre de partage refermée : on ne sait pas si le fichier est parti,
  // mais l'utilisateur a fait la démarche ; le rappel se tait pour 30 jours.
  recordSharedBackup(new Date().toISOString());
}

/** Crée le CSV de toutes les opérations et ouvre la fenêtre de partage. */
export async function shareCsv(): Promise<number> {
  const transactions = await getAllTransactions();
  await shareText(csvFileName(todayISO()), buildCsv(transactions, getCurrency()), "text/csv", "Exporter mes opérations");
  return transactions.length;
}

/**
 * Fait choisir un fichier de sauvegarde et le vérifie. Retourne null si
 * l'utilisateur annule ; lève une UserFacingError si le fichier est refusé.
 */
export async function pickBackup(): Promise<Backup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Certains gestionnaires de fichiers ne reconnaissent pas le type JSON :
    // on accepte tout, et parseBackup refuse ce qui n'est pas une sauvegarde.
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const text = await new File(result.assets[0].uri).text();
  const parsed = parseBackup(text);
  if (parsed.error !== null) throw new UserFacingError(parsed.error);
  return parsed.value;
}
