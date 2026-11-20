import type { CategoryInput, TransactionInput, TransactionType } from "@/types/transaction";
import { getCurrency } from "@/utils/currency";
import { isValidISODate } from "@/utils/dateHelpers";

/** Plafond de saisie : au-delà, c'est presque sûrement une faute de frappe. */
export const MAX_AMOUNT = 999_999_999;
export const MAX_CATEGORY_NAME = 30;

type Validation<T> = { error: string } | { error: null; value: T };

/**
 * Convertit la saisie en montant entier dans la plus petite unité de la
 * devise (francs CFA, centimes d'euro…), ou null si invalide.
 * « 1 500 » → 1500 en FCFA ; « 12,5 » ou « 12.50 » → 1250 en euros.
 * Les espaces (y compris insécables) sont ignorés.
 */
export function parseAmount(value: string, decimals: number = getCurrency().decimales): number | null {
  const normalized = value.replace(/[\s\u00a0\u202f]/g, "").replace(".", ",");
  const match = /^(\d+)(?:,(\d*))?$/.exec(normalized);
  if (!match) return null;
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) return null;

  const amount = Number(match[1]) * 10 ** decimals + Number(fraction.padEnd(decimals, "0") || "0");
  return amount > 0 && amount <= MAX_AMOUNT ? amount : null;
}

export function validateTransactionInput(
  amountText: string,
  categoryId: number | null,
  date: string,
): Validation<TransactionInput> {
  const amount = parseAmount(amountText);
  if (amount === null) {
    return { error: "Saisis un montant positif (ex. 1 500)." };
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
    ? { error: "Saisis un budget positif, ou laisse le champ vide." }
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
