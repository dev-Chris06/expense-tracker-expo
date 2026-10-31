/**
 * Connexion à la base SQLite.
 *
 * Singleton : la base n'est ouverte qu'une seule fois, puis la même instance
 * est réutilisée partout. Ouvrir plusieurs connexions vers le même fichier
 * est inutile et peut poser des problèmes de verrous.
 */
import * as SQLite from "expo-sqlite";

import { DATABASE_VERSION, MIGRATIONS } from "./schema";

const DATABASE_NAME = "expenses.db";

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Amène la base à la dernière version du schéma.
 *
 * Chaque migration et la mise à jour de user_version sont faites dans une
 * même transaction : si une migration échoue, la base reste intacte dans
 * sa version précédente au lieu d'être à moitié migrée.
 */
export function migrate(database: SQLite.SQLiteDatabase): void {
  const row = database.getFirstSync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = row?.user_version ?? 0;

  for (let version = currentVersion; version < DATABASE_VERSION; version++) {
    database.withTransactionSync(() => {
      database.execSync(MIGRATIONS[version]);
      database.execSync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

/**
 * Retourne l'instance unique de la base, en l'initialisant au premier appel.
 *
 * PRAGMA journal_mode = WAL : les lectures ne bloquent pas les écritures.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (db === null) {
    const database = SQLite.openDatabaseSync(DATABASE_NAME);
    database.execSync("PRAGMA journal_mode = WAL;");
    migrate(database);
    db = database;
  }
  return db;
}
