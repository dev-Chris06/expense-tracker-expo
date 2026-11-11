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
  // v3 — catégories personnalisables, revenus, budgets et réglages.
  // - categories : dépense ou revenu, couleur, icône (emoji), masquée,
  //   budget mensuel facultatif (dépenses uniquement). Une catégorie n'est
  //   jamais supprimée, seulement masquée : ses opérations restent valides.
  // - transactions : remplace expenses ; le type (dépense / revenu) vient
  //   de la catégorie, ce qui empêche toute incohérence.
  // - settings : réglages clé / valeur (thème, budget global…).
  `
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL CHECK (length(trim(nom)) > 0),
    type TEXT NOT NULL CHECK (type IN ('depense', 'revenu')),
    couleur TEXT NOT NULL,
    icone TEXT NOT NULL,
    masquee INTEGER NOT NULL DEFAULT 0 CHECK (masquee IN (0, 1)),
    position INTEGER NOT NULL DEFAULT 0,
    budget INTEGER CHECK (budget IS NULL OR budget > 0)
  );
  CREATE UNIQUE INDEX idx_categories_nom ON categories (type, nom COLLATE NOCASE);
  INSERT INTO categories (nom, type, couleur, icone, position) VALUES
    ('Nourriture', 'depense', '#E8590C', '🍲', 1),
    ('Transport', 'depense', '#1C7ED6', '🚕', 2),
    ('Communication', 'depense', '#7048E8', '📱', 3),
    ('Logement', 'depense', '#0CA678', '🏠', 4),
    ('Études', 'depense', '#F59F00', '📚', 5),
    ('Travail', 'depense', '#495057', '💼', 6),
    ('Santé', 'depense', '#E03131', '💊', 7),
    ('Loisirs', 'depense', '#D6336C', '🎉', 8),
    ('Autre', 'depense', '#868E96', '📦', 9),
    ('Salaire', 'revenu', '#2F9E44', '💰', 1),
    ('Commerce', 'revenu', '#0B7285', '🛒', 2),
    ('Cadeau', 'revenu', '#AE3EC9', '🎁', 3),
    ('Autre revenu', 'revenu', '#5C940D', '➕', 4);
  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    montant INTEGER NOT NULL CHECK (montant > 0),
    categorie_id INTEGER NOT NULL REFERENCES categories (id),
    date TEXT NOT NULL,
    note TEXT
  );
  INSERT INTO transactions (id, montant, categorie_id, date, note)
    SELECT e.id, e.montant, c.id, e.date, e.note
    FROM expenses e JOIN categories c ON c.type = 'depense' AND c.nom = e.categorie;
  DROP TABLE expenses;
  CREATE INDEX idx_transactions_date ON transactions (date);
  CREATE INDEX idx_transactions_categorie ON transactions (categorie_id);
  CREATE TABLE settings (
    cle TEXT PRIMARY KEY,
    valeur TEXT NOT NULL
  );
  `,
];

/** Version du schéma après application de toutes les migrations. */
export const DATABASE_VERSION = MIGRATIONS.length;
