/**
 * Schéma SQL de la base de données.
 *
 * On centralise le SQL de création ici pour que database.ts n'ait qu'à
 * l'exécuter. `CREATE TABLE IF NOT EXISTS` rend l'initialisation
 * idempotente : on peut la relancer à chaque démarrage sans risque.
 *
 * Choix de types SQLite :
 * - montant  → REAL : SQLite n'a pas de type décimal, REAL suffit pour des montants.
 * - categorie → TEXT + CHECK : la contrainte CHECK garantit côté base
 *   qu'on ne peut insérer qu'une des 9 catégories valides, même si un
 *   bug côté JS laissait passer autre chose.
 * - date     → TEXT au format ISO "YYYY-MM-DD" : SQLite n'a pas de type
 *   date natif ; le format ISO se trie et se compare correctement en texte.
 * - note     → TEXT nullable (pas de NOT NULL).
 */
import { CATEGORIES } from "@/constants/categories";

// Génère la liste 'Nourriture', 'Transport', ... pour la contrainte CHECK
const categoriesList = CATEGORIES.map((c) => `'${c}'`).join(", ");

export const CREATE_EXPENSES_TABLE = `
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    montant REAL NOT NULL CHECK (montant > 0),
    categorie TEXT NOT NULL CHECK (categorie IN (${categoriesList})),
    date TEXT NOT NULL,
    note TEXT
  );
`;

/**
 * Version du schéma. Si un jour on modifie la structure (ajout de colonne,
 * etc.), on incrémentera ce numéro et on écrira la migration correspondante
 * dans database.ts.
 */
export const DATABASE_VERSION = 1;
