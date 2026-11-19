/**
 * Logique du pavé numérique de saisie rapide.
 *
 * Le montant est gardé sous forme de chaîne de chiffres ("1500") : c'est
 * exactement ce que l'utilisateur tape, sans conversion intermédiaire.
 */
import { MAX_AMOUNT } from "@/utils/validation";

export type KeypadKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "000" | "0" | "back";

/** Ordre d'affichage, ligne par ligne (3 colonnes). */
export const KEYPAD_KEYS: readonly KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"];

const MAX_DIGITS = String(MAX_AMOUNT).length;

/** Applique une touche au montant saisi et retourne le nouveau montant. */
export function pressKey(amount: string, key: KeypadKey): string {
  if (key === "back") return amount.slice(0, -1);
  // Pas de zéro en tête : "0" puis "5" donne "5", pas "05".
  if (amount === "" && (key === "0" || key === "000")) return amount;
  const next = amount + key;
  return next.length > MAX_DIGITS ? amount : next;
}

/** "1500" → "1 500" (espaces insécables), "" → "0". */
export function formatDigits(amount: string): string {
  return (amount === "" ? "0" : amount).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
