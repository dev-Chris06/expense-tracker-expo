/**
 * Accès à la table "expenses".
 *
 * Toutes les requêtes utilisent des paramètres liés (les "?") plutôt que
 * de la concaténation de chaînes : c'est la protection standard contre
 * l'injection SQL.
 *
 * Les agrégats (totaux du mois, par catégorie, par mois) sont calculés par
 * SQLite plutôt qu'en JS : on ne charge pas toute la table pour afficher
 * trois chiffres, et l'index sur `date` rend ces requêtes rapides.
 */
import type { Category } from "@/constants/categories";
import type { Expense, ExpenseInput } from "@/types/expense";

import { getDatabase } from "./database";

export interface MonthSummary {
  total: number;
  count: number;
}

export interface CategoryTotal {
  categorie: Category;
  total: number;
  count: number;
}

export interface MonthTotal {
  /** Mois au format "YYYY-MM" */
  month: string;
  total: number;
  count: number;
}

/** Insère une dépense et retourne son id généré. */
export async function addExpense(expense: ExpenseInput): Promise<number> {
  const result = await getDatabase().runAsync(
    "INSERT INTO expenses (montant, categorie, date, note) VALUES (?, ?, ?, ?)",
    expense.montant,
    expense.categorie,
    expense.date,
    expense.note,
  );
  return result.lastInsertRowId;
}

/**
 * Retourne toutes les dépenses, les plus récentes d'abord.
 * Le tri secondaire sur id départage les dépenses d'un même jour.
 */
export async function getAllExpenses(): Promise<Expense[]> {
  return getDatabase().getAllAsync<Expense>(
    "SELECT * FROM expenses ORDER BY date DESC, id DESC",
  );
}

/** Retourne une dépense par son id, ou null si elle n'existe pas. */
export async function getExpenseById(id: number): Promise<Expense | null> {
  return getDatabase().getFirstAsync<Expense>("SELECT * FROM expenses WHERE id = ?", id);
}

/** Retourne la dépense la plus récente, ou null si la table est vide. */
export async function getLatestExpense(): Promise<Expense | null> {
  return getDatabase().getFirstAsync<Expense>(
    "SELECT * FROM expenses ORDER BY date DESC, id DESC LIMIT 1",
  );
}

/**
 * Met à jour une dépense. Retourne true si une ligne a bien été modifiée
 * (false si l'id n'existe plus, par exemple supprimée entre-temps).
 */
export async function updateExpense(id: number, expense: ExpenseInput): Promise<boolean> {
  const result = await getDatabase().runAsync(
    "UPDATE expenses SET montant = ?, categorie = ?, date = ?, note = ? WHERE id = ?",
    expense.montant,
    expense.categorie,
    expense.date,
    expense.note,
    id,
  );
  return result.changes > 0;
}

/** Supprime une dépense. Retourne true si une ligne a bien été supprimée. */
export async function deleteExpense(id: number): Promise<boolean> {
  const result = await getDatabase().runAsync("DELETE FROM expenses WHERE id = ?", id);
  return result.changes > 0;
}

/** Total et nombre de dépenses d'un mois ("YYYY-MM"). */
export async function getMonthSummary(month: string): Promise<MonthSummary> {
  const row = await getDatabase().getFirstAsync<MonthSummary>(
    "SELECT COALESCE(SUM(montant), 0) AS total, COUNT(*) AS count FROM expenses WHERE substr(date, 1, 7) = ?",
    month,
  );
  return row ?? { total: 0, count: 0 };
}

/** Totaux par catégorie pour un mois, de la plus grosse à la plus petite. */
export async function getCategoryTotals(month: string): Promise<CategoryTotal[]> {
  return getDatabase().getAllAsync<CategoryTotal>(
    `SELECT categorie, SUM(montant) AS total, COUNT(*) AS count
     FROM expenses WHERE substr(date, 1, 7) = ?
     GROUP BY categorie ORDER BY total DESC, categorie`,
    month,
  );
}

/** Totaux par mois (mois ayant au moins une dépense), du plus récent au plus ancien. */
export async function getMonthlyTotals(limit = 12): Promise<MonthTotal[]> {
  return getDatabase().getAllAsync<MonthTotal>(
    `SELECT substr(date, 1, 7) AS month, SUM(montant) AS total, COUNT(*) AS count
     FROM expenses GROUP BY month ORDER BY month DESC LIMIT ?`,
    limit,
  );
}
