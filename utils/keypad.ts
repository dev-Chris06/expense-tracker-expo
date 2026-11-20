/**
 * Logique du pavé numérique de saisie rapide.
 *
 * Le montant est gardé tel que l'utilisateur le tape ("1500", "12,5"), puis
 * converti en entier dans la plus petite unité de la devise à
 * l'enregistrement (voir parseAmount).
 */
import { getCurrency } from "@/utils/currency";
import { groupThousands } from "@/utils/formatters";
import { MAX_AMOUNT } from "@/utils/validation";

export type KeypadKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "000" | "," | "0" | "back";

/**
 * Touches dans l'ordre d'affichage, ligne par ligne (3 colonnes). En bas à
 * gauche : « 000 » pour les devises sans centimes, « , » pour les autres.
 */
export function keypadKeys(decimals: number): readonly KeypadKey[] {
  return ["1", "2", "3", "4", "5", "6", "7", "8", "9", decimals > 0 ? "," : "000", "0", "back"];
}

/** Applique une touche au montant saisi et retourne le nouveau montant. */
export function pressKey(amount: string, key: KeypadKey, decimals: number = getCurrency().decimales): string {
  if (key === "back") return amount.slice(0, -1);
  const [whole, fraction] = amount.split(",");

  if (key === ",") {
    if (decimals === 0 || fraction !== undefined) return amount;
    return `${whole === "" ? "0" : whole},`;
  }
  if (fraction !== undefined) {
    // Après la virgule : pas plus de chiffres que la devise n'en a.
    return key === "000" || fraction.length >= decimals ? amount : amount + key;
  }
  // Pas de zéro en tête : "0" puis "5" donne "5", pas "05".
  if (whole === "" && (key === "0" || key === "000")) return amount;
  const next = whole + key;
  const maxDigits = String(MAX_AMOUNT).length - decimals;
  return next.length > maxDigits ? amount : next;
}

/** "1500" → "1 500", "12,5" → "12,5", "" → "0" (espaces insécables). */
export function formatDigits(amount: string): string {
  const [whole, fraction] = (amount === "" ? "0" : amount).split(",");
  return fraction === undefined ? groupThousands(whole) : `${groupThousands(whole)},${fraction}`;
}

/** Montant stocké → texte du pavé : 1250 → "12,50" en euros, 1500 → "1500" en FCFA. */
export function toKeypadText(amount: number, decimals: number = getCurrency().decimales): string {
  const factor = 10 ** decimals;
  const fraction = amount % factor;
  const whole = String(Math.floor(amount / factor));
  return fraction === 0 ? whole : `${whole},${String(fraction).padStart(decimals, "0")}`;
}
