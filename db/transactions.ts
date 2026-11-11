/**
 * Accès à la table "transactions" (dépenses et revenus).
 *
 * Toutes les requêtes utilisent des paramètres liés (les "?") plutôt que
 * de la concaténation de chaînes : c'est la protection standard contre
 * l'injection SQL.
 *
 * Les agrégats (totaux du mois, par catégorie, par mois) sont calculés par
 * SQLite plutôt qu'en JS : on ne charge pas toute la table pour afficher
 * trois chiffres, et l'index sur `date` rend ces requêtes rapides.
 */
import type { Transaction, TransactionInput, TransactionType } from "@/types/transaction";

import { getDatabase } from "./database";

export interface MonthSummary {
  depenses: number;
  revenus: number;
  /** revenus - dépenses */
  solde: number;
  count: number;
}

export interface CategoryTotal {
  categorieId: number;
  categorie: string;
  couleur: string;
  icone: string;
  budget: number | null;
  total: number;
  count: number;
}

export interface MonthTotal {
  /** Mois au format "YYYY-MM" */
  month: string;
  depenses: number;
  revenus: number;
}

/** Colonnes d'une opération avec sa catégorie (alias = noms du type Transaction). */
const SELECT_TRANSACTION = `
  SELECT t.id, t.montant, t.categorie_id AS categorieId, t.date, t.note,
         c.nom AS categorie, c.type, c.couleur, c.icone
  FROM transactions t JOIN categories c ON c.id = t.categorie_id`;

/** Insère une opération et retourne son id généré. */
export async function addTransaction(input: TransactionInput): Promise<number> {
  const result = await getDatabase().runAsync(
    "INSERT INTO transactions (montant, categorie_id, date, note) VALUES (?, ?, ?, ?)",
    input.montant,
    input.categorieId,
    input.date,
    input.note,
  );
  return result.lastInsertRowId;
}

/**
 * Toutes les opérations, les plus récentes d'abord.
 * Le tri secondaire sur id départage les opérations d'un même jour.
 */
export async function getAllTransactions(): Promise<Transaction[]> {
  return getDatabase().getAllAsync<Transaction>(`${SELECT_TRANSACTION} ORDER BY t.date DESC, t.id DESC`);
}

/** Une opération par son id, ou null si elle n'existe pas. */
export async function getTransactionById(id: number): Promise<Transaction | null> {
  return getDatabase().getFirstAsync<Transaction>(`${SELECT_TRANSACTION} WHERE t.id = ?`, id);
}

/** L'opération la plus récente, ou null s'il n'y en a aucune. */
export async function getLatestTransaction(): Promise<Transaction | null> {
  return getDatabase().getFirstAsync<Transaction>(`${SELECT_TRANSACTION} ORDER BY t.date DESC, t.id DESC LIMIT 1`);
}

/**
 * Met à jour une opération. Retourne true si une ligne a bien été modifiée
 * (false si l'id n'existe plus, par exemple supprimée entre-temps).
 */
export async function updateTransaction(id: number, input: TransactionInput): Promise<boolean> {
  const result = await getDatabase().runAsync(
    "UPDATE transactions SET montant = ?, categorie_id = ?, date = ?, note = ? WHERE id = ?",
    input.montant,
    input.categorieId,
    input.date,
    input.note,
    id,
  );
  return result.changes > 0;
}

/** Supprime une opération. Retourne true si une ligne a bien été supprimée. */
export async function deleteTransaction(id: number): Promise<boolean> {
  const result = await getDatabase().runAsync("DELETE FROM transactions WHERE id = ?", id);
  return result.changes > 0;
}

/** Dépenses, revenus, solde et nombre d'opérations d'un mois ("YYYY-MM"). */
export async function getMonthSummary(month: string): Promise<MonthSummary> {
  const row = await getDatabase().getFirstAsync<Omit<MonthSummary, "solde">>(
    `SELECT COALESCE(SUM(CASE WHEN c.type = 'depense' THEN t.montant END), 0) AS depenses,
            COALESCE(SUM(CASE WHEN c.type = 'revenu' THEN t.montant END), 0) AS revenus,
            COUNT(*) AS count
     FROM transactions t JOIN categories c ON c.id = t.categorie_id
     WHERE substr(t.date, 1, 7) = ?`,
    month,
  );
  const depenses = row?.depenses ?? 0;
  const revenus = row?.revenus ?? 0;
  return { depenses, revenus, solde: revenus - depenses, count: row?.count ?? 0 };
}

/** Totaux par catégorie d'un type pour un mois, du plus gros au plus petit. */
export async function getCategoryTotals(month: string, type: TransactionType = "depense"): Promise<CategoryTotal[]> {
  return getDatabase().getAllAsync<CategoryTotal>(
    `SELECT c.id AS categorieId, c.nom AS categorie, c.couleur, c.icone, c.budget,
            SUM(t.montant) AS total, COUNT(*) AS count
     FROM transactions t JOIN categories c ON c.id = t.categorie_id
     WHERE substr(t.date, 1, 7) = ? AND c.type = ?
     GROUP BY c.id ORDER BY total DESC, c.nom`,
    month,
    type,
  );
}

/**
 * Catégories de dépenses ayant un budget, avec ce qui a été dépensé dans le
 * mois (0 si rien), pour le suivi des budgets.
 */
export async function getBudgetUsage(month: string): Promise<CategoryTotal[]> {
  return getDatabase().getAllAsync<CategoryTotal>(
    `SELECT c.id AS categorieId, c.nom AS categorie, c.couleur, c.icone, c.budget,
            COALESCE(SUM(t.montant), 0) AS total, COUNT(t.id) AS count
     FROM categories c
     LEFT JOIN transactions t ON t.categorie_id = c.id AND substr(t.date, 1, 7) = ?
     WHERE c.type = 'depense' AND c.budget IS NOT NULL
     GROUP BY c.id ORDER BY c.position, c.nom`,
    month,
  );
}

/** Totaux par mois (mois ayant au moins une opération), du plus récent au plus ancien. */
export async function getMonthlyTotals(limit = 12): Promise<MonthTotal[]> {
  return getDatabase().getAllAsync<MonthTotal>(
    `SELECT substr(t.date, 1, 7) AS month,
            COALESCE(SUM(CASE WHEN c.type = 'depense' THEN t.montant END), 0) AS depenses,
            COALESCE(SUM(CASE WHEN c.type = 'revenu' THEN t.montant END), 0) AS revenus
     FROM transactions t JOIN categories c ON c.id = t.categorie_id
     GROUP BY month ORDER BY month DESC LIMIT ?`,
    limit,
  );
}
