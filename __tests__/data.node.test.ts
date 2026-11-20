/**
 * @jest-environment node
 *
 * Opérations qui modifient beaucoup de données d'un coup (changement de
 * devise, récurrences, restauration), testées sur une vraie base SQLite en
 * mémoire (node:sqlite) après toutes les migrations.
 */
import { migrate } from "../db/database";
import { findCurrency } from "../constants/currencies";

jest.mock("expo-sqlite", () => ({}));

interface Statement {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
}
interface DatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): Statement;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (path: string) => DatabaseSync };

/** La petite partie de l'API synchrone d'expo-sqlite utilisée par ces modules. */
function mockAdapter(db: DatabaseSync) {
  return {
    getFirstSync: (sql: string, ...p: unknown[]) => db.prepare(sql).get(...p) ?? null,
    getAllSync: (sql: string, ...p: unknown[]) => db.prepare(sql).all(...p),
    runSync: (sql: string, ...p: unknown[]) => db.prepare(sql).run(...p),
    execSync: (sql: string) => db.exec(sql),
    withTransactionSync: (task: () => void) => {
      db.exec("BEGIN");
      try {
        task();
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

let mockDb: DatabaseSync;
jest.mock("../db/database", () => {
  const actual = jest.requireActual("../db/database");
  return { ...actual, getDatabase: () => mockAdapter(mockDb) };
});

/* eslint-disable import/first */
import { readBackup, restoreBackup } from "../db/backup";
import { applyDueRecurrences } from "../db/recurrences";
import { changeCurrency, getCurrencyCode, getMonthlyBudget, setMonthlyBudget } from "../db/settings";
import { parseBackup } from "../utils/backup";
/* eslint-enable import/first */

const rows = (sql: string) => mockDb.prepare(sql).all();

beforeEach(() => {
  mockDb = new DatabaseSync(":memory:");
  mockDb.exec("PRAGMA foreign_keys = ON");
  migrate(mockAdapter(mockDb) as unknown as Parameters<typeof migrate>[0]);
  mockDb.exec(`INSERT INTO transactions (montant, categorie_id, date, note) VALUES
    (5000, 1, '2026-11-02', 'marché'), (1500, 2, '2026-11-03', NULL)`);
});

describe("changeCurrency", () => {
  it("keeps the typed digits when moving to a currency with cents", () => {
    setMonthlyBudget(20000);
    mockDb.exec("UPDATE categories SET budget = 2000 WHERE id = 1");
    mockDb.exec("INSERT INTO recurrences (montant, categorie_id, jour, dernier_mois) VALUES (30000, 4, 5, '2026-11')");

    changeCurrency(findCurrency("XOF"), findCurrency("EUR"));

    expect(getCurrencyCode()).toBe("EUR");
    expect(rows("SELECT montant FROM transactions ORDER BY id")).toEqual([{ montant: 500000 }, { montant: 150000 }]);
    expect(getMonthlyBudget()).toBe(2000000);
    expect(rows("SELECT budget FROM categories WHERE id = 1")).toEqual([{ budget: 200000 }]);
    expect(rows("SELECT montant FROM recurrences")).toEqual([{ montant: 3000000 }]);
  });

  it("rounds when going back to a currency without cents, never below 1", () => {
    mockDb.exec("INSERT INTO transactions (montant, categorie_id, date) VALUES (1250, 1, '2026-11-04'), (1, 1, '2026-11-04')");
    changeCurrency(findCurrency("EUR"), findCurrency("XOF"));
    expect(rows("SELECT montant FROM transactions ORDER BY id")).toEqual([
      { montant: 50 },
      { montant: 15 },
      { montant: 13 },
      { montant: 1 },
    ]);
    // Choix explicite : enregistré, même pour la devise par défaut.
    expect(rows("SELECT valeur FROM settings WHERE cle = 'devise'")).toEqual([{ valeur: "XOF" }]);
  });

  it("does not touch amounts between currencies with the same decimals", () => {
    changeCurrency(findCurrency("XOF"), findCurrency("GNF"));
    expect(rows("SELECT montant FROM transactions ORDER BY id")).toEqual([{ montant: 5000 }, { montant: 1500 }]);
    expect(getCurrencyCode()).toBe("GNF");
  });
});

describe("applyDueRecurrences", () => {
  it("creates each missed month once, then nothing more", () => {
    mockDb.exec("INSERT INTO recurrences (montant, categorie_id, note, jour, dernier_mois) VALUES (30000, 4, 'Loyer', 31, '2026-08')");
    mockDb.exec("INSERT INTO recurrences (montant, categorie_id, jour, dernier_mois, active) VALUES (999, 1, 1, '2026-01', 0)");

    expect(applyDueRecurrences("2026-11-20")).toBe(2);
    expect(rows("SELECT date, note FROM transactions WHERE montant = 30000 ORDER BY date")).toEqual([
      { date: "2026-09-30", note: "Loyer" },
      { date: "2026-10-31", note: "Loyer" },
    ]);
    expect(applyDueRecurrences("2026-11-20")).toBe(0);
    expect(applyDueRecurrences("2026-11-30")).toBe(1);
    expect(rows("SELECT COUNT(*) AS n FROM transactions WHERE montant = 999")).toEqual([{ n: 0 }]);
  });
});

describe("backup round trip", () => {
  it("restores exactly what was saved, replacing current data", () => {
    setMonthlyBudget(20000);
    mockDb.exec("INSERT INTO categories (nom, type, couleur, icone) VALUES ('Parents', 'revenu', '#000000', 'home-outline')");
    mockDb.exec("INSERT INTO transactions (montant, categorie_id, date) VALUES (5000, 14, '2026-11-20')");
    mockDb.exec("INSERT INTO recurrences (montant, categorie_id, jour, dernier_mois) VALUES (2000, 3, 5, '2026-11')");
    const saved = readBackup(new Date("2026-11-20T10:00:00Z"));
    const text = JSON.stringify(saved);

    // Le téléphone change : autres données.
    mockDb.exec("DELETE FROM transactions");
    mockDb.exec("INSERT INTO transactions (montant, categorie_id, date) VALUES (1, 1, '2026-01-01')");
    setMonthlyBudget(null);

    const parsed = parseBackup(text);
    if (parsed.error !== null) throw new Error(parsed.error);
    restoreBackup(parsed.value);

    expect(readBackup(new Date("2026-11-20T10:00:00Z"))).toEqual(saved);
    expect(getMonthlyBudget()).toBe(20000);
  });

  it("keeps this phone's own settings out of backups and restores", () => {
    mockDb.exec("INSERT INTO settings (cle, valeur) VALUES ('appareil_sauvegarde_dossier', 'content://ancien'), ('theme', 'dark')");
    const saved = readBackup();
    expect(saved.settings.map((s) => s.cle)).toEqual(["theme"]);

    mockDb.exec("UPDATE settings SET valeur = 'content://nouveau' WHERE cle = 'appareil_sauvegarde_dossier'");
    saved.settings.push({ cle: "appareil_sauvegarde_dossier", valeur: "content://autre-telephone" });
    restoreBackup(saved);
    expect(rows("SELECT cle, valeur FROM settings ORDER BY cle")).toEqual([
      { cle: "appareil_sauvegarde_dossier", valeur: "content://nouveau" },
      { cle: "theme", valeur: "dark" },
    ]);
  });

  it("leaves current data untouched if the restore fails midway", () => {
    const saved = readBackup();
    // Deux catégories de même nom : refusé par la base au milieu de l'import.
    saved.categories.push({ ...saved.categories[0], id: 99 });
    expect(() => restoreBackup(saved)).toThrow();
    expect(rows("SELECT COUNT(*) AS n FROM transactions")).toEqual([{ n: 2 }]);
  });
});
