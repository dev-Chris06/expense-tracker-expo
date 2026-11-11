import type { CategoryInput, TransactionInput, TransactionType } from "@/types/transaction";
import { isValidISODate } from "@/utils/dateHelpers";

/** Plafond de saisie : au-delà, c'est presque sûrement une faute de frappe. */
export const MAX_AMOUNT = 999_999_999;
export const MAX_CATEGORY_NAME = 30;

type Validation<T> = { error: string } | { error: null; value: T };

/**
 * Convertit la saisie en montant entier de FCFA, ou null si invalide.
 * Les espaces (y compris insécables, comme dans « 1 500 ») sont ignorés.
 */
export function parseAmount(value: string): number | null {
  const normalized = value.replace(/[\s  ]/g, "");
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  return amount > 0 && amount <= MAX_AMOUNT ? amount : null;
}

export function validateTransactionInput(
  amountText: string,
  categoryId: number | null,
  date: string,
): Validation<TransactionInput> {
  const amount = parseAmount(amountText);
  if (amount === null) {
    return { error: "Saisis un montant entier positif en FCFA (ex. 1 500)." };
  }
  if (categoryId === null) {
    return { error: "Choisis une catégorie." };
  }
  if (!isValidISODate(date)) {
    return { error: "Choisis une date valide." };
  }

  return { error: null, value: { montant: amount, categorieId: categoryId, date, note: null } };
}

/** Budget facultatif : champ vide → null, sinon un montant valide. */
export function parseOptionalBudget(value: string): Validation<number | null> {
  if (value.trim() === "") return { error: null, value: null };
  const amount = parseAmount(value);
  return amount === null
    ? { error: "Saisis un budget entier positif en FCFA, ou laisse le champ vide." }
    : { error: null, value: amount };
}

export function validateCategoryInput(fields: {
  nom: string;
  type: TransactionType;
  couleur: string;
  icone: string;
  masquee: boolean;
  budgetText: string;
}): Validation<CategoryInput> {
  const nom = fields.nom.trim().replace(/\s+/g, " ");
  if (nom === "") {
    return { error: "Donne un nom à la catégorie." };
  }
  if (nom.length > MAX_CATEGORY_NAME) {
    return { error: `Le nom ne doit pas dépasser ${MAX_CATEGORY_NAME} caractères.` };
  }
  const budget = fields.type === "depense" ? parseOptionalBudget(fields.budgetText) : { error: null, value: null };
  if (budget.error !== null) {
    return { error: budget.error };
  }
  return {
    error: null,
    value: {
      nom,
      type: fields.type,
      couleur: fields.couleur,
      icone: fields.icone,
      masquee: fields.masquee,
      budget: budget.value,
    },
  };
}
