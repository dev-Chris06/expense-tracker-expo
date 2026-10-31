/**
 * Schéma SQL et migrations de la base de données.
 *
 * Le numéro de version est stocké dans la base elle-même via
 * `PRAGMA user_version`. Au démarrage, database.ts exécute dans l'ordre
 * toutes les migrations dont l'index est >= à la version actuelle.
 *
 * Règle d'or : une migration publiée ne se modifie JAMAIS. Pour changer le
 * schéma (nouvelle colonne, nouvelle catégorie autorisée…), on ajoute une
 * nouvelle entrée à la fin du tableau. C'est pour ça que la liste des
 * catégories est figée en dur ici au lieu d'être générée depuis CATEGORIES :
 * si on modifie CATEGORIES, il faut écrire une migration qui reconstruit la
 * table avec la nouvelle contrainte CHECK.
 *
 * Choix de types SQLite :
 * - montant  → INTEGER : le franc CFA n'a pas de centimes, et les entiers
 *   garantissent des totaux exacts (pas d'erreur d'arrondi des flottants).
 * - categorie → TEXT + CHECK : la base refuse toute catégorie inconnue.
 * - date     → TEXT ISO "YYYY-MM-DD" : se trie et se compare en texte.
 * - note     → TEXT nullable.
 */

export const MIGRATIONS: readonly string[] = [
  // v1 — table initiale (montants en REAL). `IF NOT EXISTS` car les
  // installations antérieures au système de migrations ont déjà la table
  // mais une user_version à 0.
  `
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    montant REAL NOT NULL CHECK (montant > 0),
    categorie TEXT NOT NULL CHECK (categorie IN ('Nourriture', 'Transport', 'Communication', 'Logement', 'Études', 'Travail', 'Santé', 'Loisirs', 'Autre')),
    date TEXT NOT NULL,
    note TEXT
  );
  `,
  // v2 — montants entiers + index sur la date (filtres par mois).
  // SQLite ne sait pas changer le type d'une colonne : on recrée la table
  // et on recopie les données en arrondissant (minimum 1 FCFA).
  `
  CREATE TABLE expenses_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    montant INTEGER NOT NULL CHECK (montant > 0),
    categorie TEXT NOT NULL CHECK (categorie IN ('Nourriture', 'Transport', 'Communication', 'Logement', 'Études', 'Travail', 'Santé', 'Loisirs', 'Autre')),
    date TEXT NOT NULL,
    note TEXT
  );
  INSERT INTO expenses_v2 (id, montant, categorie, date, note)
    SELECT id, MAX(1, CAST(ROUND(montant) AS INTEGER)), categorie, date, note FROM expenses;
  DROP TABLE expenses;
  ALTER TABLE expenses_v2 RENAME TO expenses;
  CREATE INDEX idx_expenses_date ON expenses (date);
  `,
];

/** Version du schéma après application de toutes les migrations. */
export const DATABASE_VERSION = MIGRATIONS.length;
