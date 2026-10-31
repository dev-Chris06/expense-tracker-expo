/**
 * @jest-environment node
 *
 * Exécute les vraies migrations sur une base SQLite en mémoire (module
 * node:sqlite de Node.js) pour vérifier qu'une base créée par l'ancienne
 * version de l'app est correctement convertie.
 */
import { migrate } from "../db/database";
import { DATABASE_VERSION, MIGRATIONS } from "../db/schema";

jest.mock("expo-sqlite", () => ({}));

/** Sous-ensemble typé de node:sqlite (pas de @types/node dans le projet). */
interface Statement {
  get(): unknown;
  all(): unknown[];
}
interface DatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): Statement;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (path: string) => DatabaseSync };

/** Adapte node:sqlite à la petite partie de l'API expo-sqlite utilisée par migrate(). */
function adapter(db: DatabaseSync) {
  return {
    getFirstSync: (sql: string) => db.prepare(sql).get(),
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
  } as unknown as Parameters<typeof migrate>[0];
}

const userVersion = (db: DatabaseSync) =>
  (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;

describe("database migrations", () => {
  it("creates the latest schema on a fresh database", () => {
    const db = new DatabaseSync(":memory:");
    migrate(adapter(db));

    expect(userVersion(db)).toBe(DATABASE_VERSION);
    const columns = db.prepare("PRAGMA table_info(expenses)").all() as { name: string; type: string }[];
    expect(columns.find((c) => c.name === "montant")?.type).toBe("INTEGER");
    const indexes = db.prepare("PRAGMA index_list(expenses)").all() as { name: string }[];
    expect(indexes.map((i) => i.name)).toContain("idx_expenses_date");
  });

  it("converts a legacy v1 database (REAL amounts, user_version 0)", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATIONS[0]); // base créée par l'ancienne app, sans user_version
    db.exec(`INSERT INTO expenses (montant, categorie, date, note) VALUES
      (1500, 'Transport', '2026-10-01', 'taxi'),
      (99.6, 'Nourriture', '2026-10-02', NULL),
      (0.2, 'Autre', '2026-10-03', NULL)`);

    migrate(adapter(db));

    expect(userVersion(db)).toBe(DATABASE_VERSION);
    expect(db.prepare("SELECT id, montant, note FROM expenses ORDER BY id").all()).toEqual([
      { id: 1, montant: 1500, note: "taxi" },
      { id: 2, montant: 100, note: null },
      { id: 3, montant: 1, note: null },
    ]);
  });

  it("is idempotent and keeps rejecting invalid rows", () => {
    const db = new DatabaseSync(":memory:");
    migrate(adapter(db));
    migrate(adapter(db));

    expect(() =>
      db.exec("INSERT INTO expenses (montant, categorie, date) VALUES (10, 'Inconnue', '2026-10-01')"),
    ).toThrow();
    expect(() =>
      db.exec("INSERT INTO expenses (montant, categorie, date) VALUES (0, 'Autre', '2026-10-01')"),
    ).toThrow();
  });
});
