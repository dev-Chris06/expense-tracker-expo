import type { Category } from "@/constants/categories";
import type { ExpenseInput } from "@/types/expense";
import { isValidISODate } from "@/utils/dateHelpers";

export function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function validateExpenseInput(
  amountText: string,
  category: Category | null,
  date: string,
): { error: string } | { error: null; value: ExpenseInput } {
  const amount = parseAmount(amountText);
  if (amount === null) {
    return { error: "Saisis un montant positif (jusqu’à deux décimales)." };
  }
  if (category === null) {
    return { error: "Choisis une catégorie." };
  }
  if (!isValidISODate(date)) {
    return { error: "Choisis une date valide." };
  }

  return { error: null, value: { montant: amount, categorie: category, date, note: null } };
}
