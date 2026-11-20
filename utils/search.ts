import type { Transaction } from "@/types/transaction";
import { formatDisplayDate } from "@/utils/dateHelpers";
import { formatMajor } from "@/utils/formatters";

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
 * Indique si une opération correspond à la recherche. On compare aussi bien
 * les valeurs brutes que les formats affichés à l'écran (date JJ/MM/AAAA).
 */
export function matchesQuery(transaction: Transaction, query: string): boolean {
  const needle = normalizeForSearch(query);
  if (needle === "") {
    return true;
  }

  const fields = [
    transaction.categorie,
    transaction.note ?? "",
    transaction.date,
    formatDisplayDate(transaction.date),
    String(transaction.montant),
    formatMajor(transaction.montant),
  ];
  return fields.some((field) => normalizeForSearch(field).includes(needle));
}

/** Devise correspondant à la recherche : nom, code ou pays (« benin » → franc CFA). */
export function currencyMatches(
  currency: { code: string; nom: string; pays: readonly string[] },
  query: string,
): boolean {
  const needle = normalizeForSearch(query);
  if (needle === "") return true;
  return [currency.nom, currency.code, ...currency.pays].some((field) => normalizeForSearch(field).includes(needle));
}
