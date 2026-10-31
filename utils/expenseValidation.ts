import type { Category } from "@/constants/categories";
import type { ExpenseInput } from "@/types/expense";
import { isValidISODate } from "@/utils/dateHelpers";

/** Plafond de saisie : au-delà, c'est presque sûrement une faute de frappe. */
export const MAX_AMOUNT = 999_999_999;

/**
 * Convertit la saisie en montant entier de FCFA, ou null si invalide.
 * Les espaces (y compris insécables, comme dans « 1 500 ») sont ignorés.
 */
export function parseAmount(value: string): number | null {
  const normalized = value.replace(/[\s  ]/g, "");
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  return amount > 0 && amount <= MAX_AMOUNT ? amount : null;
}

export function validateExpenseInput(
  amountText: string,
  category: Category | null,
  date: string,
): { error: string } | { error: null; value: ExpenseInput } {
  const amount = parseAmount(amountText);
  if (amount === null) {
    return { error: "Saisis un montant entier positif en FCFA (ex. 1 500)." };
  }
  if (category === null) {
    return { error: "Choisis une catégorie." };
  }
  if (!isValidISODate(date)) {
    return { error: "Choisis une date valide." };
  }

  return { error: null, value: { montant: amount, categorie: category, date, note: null } };
}
