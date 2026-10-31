/**
 * Fonctions CRUD pour la table "expenses".
 *
 * Toutes les requêtes utilisent des paramètres liés (les "?") plutôt que
 * de la concaténation de chaînes : c'est la protection standard contre
 * l'injection SQL, et SQLite gère l'échappement pour nous.
 *
 * On utilise les méthodes async d'expo-sqlite (runAsync, getAllAsync...) :
 * les écritures/lectures ne bloquent pas le thread JS, donc pas de
 * blocage de l'interface pendant les accès disque.
 */
import type { Expense, ExpenseInput } from "@/types/expense";

import { getDatabase } from "./database";

/**
 * Insère une dépense et retourne son id généré.
 */
export async function addExpense(expense: ExpenseInput): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync(
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
  const db = getDatabase();
  return db.getAllAsync<Expense>(
    "SELECT * FROM expenses ORDER BY date DESC, id DESC",
  );
}

/**
 * Retourne une dépense par son id, ou null si elle n'existe pas.
 * (Servira pour l'écran edit/[id].)
 */
export async function getExpenseById(id: number): Promise<Expense | null> {
  const db = getDatabase();
  return db.getFirstAsync<Expense>("SELECT * FROM expenses WHERE id = ?", id);
}

/**
 * Met à jour une dépense. Retourne true si une ligne a bien été modifiée
 * (false si l'id n'existe pas).
 */
export async function updateExpense(
  id: number,
  expense: ExpenseInput,
): Promise<boolean> {
  const db = getDatabase();
  const result = await db.runAsync(
    "UPDATE expenses SET montant = ?, categorie = ?, date = ?, note = ? WHERE id = ?",
    expense.montant,
    expense.categorie,
    expense.date,
    expense.note,
    id,
  );
  return result.changes > 0;
}

/**
 * Supprime une dépense. Retourne true si une ligne a bien été supprimée.
 */
export async function deleteExpense(id: number): Promise<boolean> {
  const db = getDatabase();
  const result = await db.runAsync("DELETE FROM expenses WHERE id = ?", id);
  return result.changes > 0;
}
