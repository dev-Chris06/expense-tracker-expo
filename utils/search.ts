import type { Expense } from "@/types/expense";
import { formatDisplayDate } from "@/utils/dateHelpers";

/**
 * Prépare un texte pour la comparaison : minuscules, sans accents et sans
 * espaces. Ainsi « etudes » trouve « Études » et « 1 500 » trouve 1500.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s  ]/g, "");
}

/**
 * Indique si une dépense correspond à la recherche. On compare aussi bien
 * les valeurs brutes que les formats affichés à l'écran (date JJ/MM/AAAA).
 */
export function matchesQuery(expense: Expense, query: string): boolean {
  const needle = normalizeForSearch(query);
  if (needle === "") {
    return true;
  }

  const fields = [
    expense.categorie,
    expense.note ?? "",
    expense.date,
    formatDisplayDate(expense.date),
    String(expense.montant),
  ];
  return fields.some((field) => normalizeForSearch(field).includes(needle));
}
