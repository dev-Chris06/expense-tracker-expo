/**
 * Connexion à la base SQLite.
 *
 * expo-sqlite (API moderne, SDK 50+) expose deux façons d'ouvrir une base :
 * - openDatabaseSync : synchrone, pratique pour une petite base locale.
 * - openDatabaseAsync : asynchrone.
 *
 * On utilise ici un singleton : la base n'est ouverte qu'une seule fois,
 * puis la même instance est réutilisée partout. Ouvrir plusieurs connexions
 * vers le même fichier est inutile et peut poser des problèmes de verrous.
 */
import * as SQLite from "expo-sqlite";

import { CREATE_EXPENSES_TABLE } from "./schema";

const DATABASE_NAME = "expenses.db";

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Retourne l'instance unique de la base, en l'initialisant au premier appel.
 *
 * PRAGMA journal_mode = WAL ("Write-Ahead Logging") : mode de journalisation
 * recommandé par Expo — les lectures ne bloquent pas les écritures,
 * ce qui rend l'app plus fluide.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (db === null) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
    db.execSync("PRAGMA journal_mode = WAL;");
    db.execSync(CREATE_EXPENSES_TABLE);
  }
  return db;
}
