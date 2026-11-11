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

interface CategoryRow {
  id: number;
  nom: string;
  type: string;
}

describe("database migrations", () => {
  it("creates the latest schema on a fresh database", () => {
    const db = new DatabaseSync(":memory:");
    migrate(adapter(db));

    expect(userVersion(db)).toBe(DATABASE_VERSION);
    const columns = db.prepare("PRAGMA table_info(transactions)").all() as { name: string; type: string }[];
    expect(columns.find((c) => c.name === "montant")?.type).toBe("INTEGER");
    const indexes = db.prepare("PRAGMA index_list(transactions)").all() as { name: string }[];
    expect(indexes.map((i) => i.name)).toEqual(
      expect.arrayContaining(["idx_transactions_date", "idx_transactions_categorie"]),
    );
    const categories = db.prepare("SELECT id, nom, type FROM categories ORDER BY id").all() as CategoryRow[];
    expect(categories.filter((c) => c.type === "depense")).toHaveLength(9);
    expect(categories.filter((c) => c.type === "revenu")).toHaveLength(4);
    expect(db.prepare("SELECT COUNT(*) AS n FROM settings").get()).toEqual({ n: 0 });
  });

  it("converts a legacy v1 database (REAL amounts, user_version 0)", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATIONS[0]); // base créée par l'ancienne app, sans user_version
    db.exec(`INSERT INTO expenses (montant, categorie, date, note) VALUES
      (1500, 'Transport', '2026-10-01', 'taxi'),
      (99.6, 'Nourriture', '2026-10-02', NULL),
      (0.2, 'Études', '2026-10-03', NULL)`);

    migrate(adapter(db));

    expect(userVersion(db)).toBe(DATABASE_VERSION);
    expect(
      db
        .prepare(
          `SELECT t.id, t.montant, c.nom AS categorie, c.type, t.date, t.note
           FROM transactions t JOIN categories c ON c.id = t.categorie_id ORDER BY t.id`,
        )
        .all(),
    ).toEqual([
      { id: 1, montant: 1500, categorie: "Transport", type: "depense", date: "2026-10-01", note: "taxi" },
      { id: 2, montant: 100, categorie: "Nourriture", type: "depense", date: "2026-10-02", note: null },
      { id: 3, montant: 1, categorie: "Études", type: "depense", date: "2026-10-03", note: null },
    ]);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
    expect(tables.map((t) => t.name)).not.toContain("expenses");
  });

  it("converts a v2 database without losing any row", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATIONS[0]);
    db.exec(MIGRATIONS[1]);
    db.exec("PRAGMA user_version = 2");
    const names = ["Nourriture", "Transport", "Communication", "Logement", "Études", "Travail", "Santé", "Loisirs", "Autre"];
    names.forEach((nom, i) =>
      db.exec(`INSERT INTO expenses (montant, categorie, date) VALUES (${(i + 1) * 100}, '${nom}', '2026-10-01')`),
    );

    migrate(adapter(db));

    expect(db.prepare("SELECT COUNT(*) AS n, SUM(montant) AS total FROM transactions").get()).toEqual({
      n: 9,
      total: 4500,
    });
  });

  it("is idempotent and keeps rejecting invalid rows", () => {
    const db = new DatabaseSync(":memory:");
    migrate(adapter(db));
    migrate(adapter(db));

    expect(() =>
      db.exec("INSERT INTO transactions (montant, categorie_id, date) VALUES (0, 1, '2026-10-01')"),
    ).toThrow();
    // Noms uniques par type, sans tenir compte de la casse.
    expect(() =>
      db.exec("INSERT INTO categories (nom, type, couleur, icone) VALUES ('nourriture', 'depense', '#000000', '🍲')"),
    ).toThrow();
    expect(() =>
      db.exec("INSERT INTO categories (nom, type, couleur, icone) VALUES ('Prime', 'autre', '#000000', '🍲')"),
    ).toThrow();
    expect(() =>
      db.exec("INSERT INTO categories (nom, type, couleur, icone, budget) VALUES ('Prime', 'revenu', '#000000', '🎁', 0)"),
    ).toThrow();
  });
});
