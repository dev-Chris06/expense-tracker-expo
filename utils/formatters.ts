/**
 * Formatage des montants dans la devise choisie.
 *
 * Les montants arrivent en entiers dans la plus petite unité de la devise
 * (francs CFA, centimes d'euro…). Le séparateur de milliers est posé à la
 * main (espace insécable) plutôt que via Intl : le rendu est ainsi
 * identique sur tous les moteurs JS et reste prévisible dans les tests.
 */
import type { Currency } from "@/constants/currencies";
import { getCurrency } from "@/utils/currency";

const NBSP = " ";

/** Groupe les chiffres par milliers : "1500" → "1 500". */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/**
 * Valeur absolue en unités de la devise, sans symbole : 1500 → "1 500"
 * en FCFA ; 1250 → "12,50" et 1200 → "12" en euros (pas de ",00" inutile).
 */
export function formatMajor(amount: number, currency: Currency = getCurrency()): string {
  const minor = Math.round(Math.abs(amount));
  const factor = 10 ** currency.decimales;
  const whole = groupThousands(String(Math.floor(minor / factor)));
  const fraction = minor % factor;
  return fraction === 0 ? whole : `${whole},${String(fraction).padStart(currency.decimales, "0")}`;
}

/** Montant avec son symbole : 1500 → "1 500 F", -1500 → "-1 500 F". */
export function formatAmount(amount: number, currency: Currency = getCurrency()): string {
  return `${amount < 0 ? "-" : ""}${formatMajor(amount, currency)}${NBSP}${currency.symbole}`;
}

/** Valeur absolue avec son symbole : -1500 → "1 500 F". */
export function formatShort(amount: number, currency: Currency = getCurrency()): string {
  return formatAmount(Math.abs(amount), currency);
}

/** Solde signé : "+42 500 F", "−3 000 F", "0 F". */
export function formatNet(amount: number, currency: Currency = getCurrency()): string {
  return `${amount > 0 ? "+" : amount < 0 ? "−" : ""}${formatShort(amount, currency)}`;
}

/** "3 opérations", "1 opération", "0 opération". */
export function formatCount(count: number): string {
  return `${count} opération${count > 1 ? "s" : ""}`;
}
