/**
 * Sauvegarde automatique : une fois par semaine, à l'ouverture de l'app,
 * une sauvegarde est écrite dans un dossier choisi une fois pour toutes.
 *
 * Android garde l'autorisation d'écrire dans ce dossier (accès « SAF »).
 * Seules les 5 dernières sauvegardes sont gardées. Faite à l'ouverture
 * plutôt qu'en arrière-plan : Android (Samsung surtout) coupe souvent les
 * tâches de fond pour économiser la batterie.
 */
import { Directory, File } from "expo-file-system";

import { readBackup } from "@/db/backup";
import { getAutoBackupState, recordAutoBackup, setAutoBackupFolder } from "@/db/settings";
import { backupFileName } from "@/utils/backup";
import { todayISO } from "@/utils/dateHelpers";

const INTERVAL_DAYS = 7;
const KEEP = 5;
const BACKUP_FILE = /^depenses-perso-sauvegarde-\d{4}-\d{2}-\d{2}.*\.json$/;

/** Une sauvegarde est-elle due ? (jamais faite, ou il y a 7 jours ou plus) */
export function isBackupDue(last: string | null, now: Date = new Date()): boolean {
  if (last === null) return true;
  const elapsed = now.getTime() - new Date(last).getTime();
  return !(elapsed >= 0 && elapsed < INTERVAL_DAYS * 24 * 60 * 60 * 1000);
}

/** Fichiers de sauvegarde à supprimer pour n'en garder que 5 (les plus récents). */
export function backupsToDelete(names: readonly string[], keep: number = KEEP): string[] {
  return names
    .filter((name) => BACKUP_FILE.test(name))
    .sort()
    .reverse()
    .slice(keep);
}

/**
 * Nom lisible d'un dossier choisi :
 * "content://…/tree/primary%3ADocuments%2FD%C3%A9penses" → "Documents/Dépenses".
 */
export function folderLabel(uri: string): string {
  const tree = uri.split("/tree/")[1] ?? uri.split("/").pop() ?? uri;
  let decoded = tree;
  try {
    decoded = decodeURIComponent(tree);
  } catch {
    // Laisser tel quel.
  }
  const path = decoded.includes(":") ? decoded.slice(decoded.indexOf(":") + 1) : decoded;
  return path === "" ? "Mémoire du téléphone" : path;
}

/** Écrit une sauvegarde dans le dossier choisi et fait le ménage. */
export async function writeAutoBackup(folderUri: string, now: Date = new Date()): Promise<void> {
  const directory = new Directory(folderUri);
  const name = backupFileName(todayISO());
  // Même jour : on remplace (sinon Android créerait « … (1).json »).
  for (const entry of directory.list()) {
    if (entry instanceof File && entry.name === name) entry.delete();
  }
  const file = directory.createFile(name, "application/json");
  await file.write(JSON.stringify(readBackup(now)));

  const files = directory.list().filter((entry): entry is File => entry instanceof File);
  const stale = new Set(backupsToDelete(files.map((f) => f.name)));
  for (const f of files) {
    if (stale.has(f.name)) f.delete();
  }
  recordAutoBackup({ at: now.toISOString() });
}

/**
 * À l'ouverture de l'app : sauvegarde si un dossier est choisi et que la
 * dernière date d'une semaine ou plus. Ne lève jamais d'erreur : un échec
 * est noté et affiché dans les réglages.
 */
export async function runAutoBackupIfDue(now: Date = new Date()): Promise<void> {
  try {
    const state = getAutoBackupState();
    if (state.folder === null || !isBackupDue(state.last, now)) return;
    await writeAutoBackup(state.folder, now);
  } catch {
    try {
      recordAutoBackup({ error: "Le dossier n'est plus accessible. Choisis-le à nouveau." });
    } catch {
      // Base illisible : rien de plus à faire ici.
    }
  }
}

/** Fait choisir le dossier puis y écrit tout de suite une première sauvegarde. */
export async function chooseBackupFolder(): Promise<boolean> {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch {
    return false; // Annulé.
  }
  setAutoBackupFolder(directory.uri);
  await writeAutoBackup(directory.uri);
  return true;
}
