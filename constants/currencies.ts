/**
 * Devises proposées dans les réglages (une seule devise par utilisateur).
 *
 * Les montants sont stockés en entiers dans la plus petite unité de la
 * devise : des francs CFA (pas de centimes), des centimes d'euro, etc.
 * `decimales` dit combien de chiffres après la virgule la devise utilise.
 */
export interface Currency {
  /** Code ISO 4217 */
  code: string;
  nom: string;
  /** Affiché après le montant : « 1 500 F », « 12,50 € ». */
  symbole: string;
  decimales: 0 | 2 | 3;
}

export const CURRENCIES: readonly Currency[] = [
  { code: "XOF", nom: "Franc CFA (UEMOA)", symbole: "F", decimales: 0 },
  { code: "XAF", nom: "Franc CFA (CEMAC)", symbole: "F", decimales: 0 },
  { code: "EUR", nom: "Euro", symbole: "€", decimales: 2 },
  { code: "USD", nom: "Dollar américain", symbole: "$", decimales: 2 },
  { code: "CAD", nom: "Dollar canadien", symbole: "$ CA", decimales: 2 },
  { code: "GBP", nom: "Livre sterling", symbole: "£", decimales: 2 },
  { code: "CHF", nom: "Franc suisse", symbole: "CHF", decimales: 2 },
  { code: "NGN", nom: "Naira", symbole: "₦", decimales: 2 },
  { code: "GHS", nom: "Cedi", symbole: "GH₵", decimales: 2 },
  { code: "GNF", nom: "Franc guinéen", symbole: "FG", decimales: 0 },
  { code: "CDF", nom: "Franc congolais", symbole: "FC", decimales: 2 },
  { code: "MAD", nom: "Dirham marocain", symbole: "DH", decimales: 2 },
  { code: "DZD", nom: "Dinar algérien", symbole: "DA", decimales: 2 },
  { code: "TND", nom: "Dinar tunisien", symbole: "DT", decimales: 3 },
  { code: "MGA", nom: "Ariary", symbole: "Ar", decimales: 0 },
  { code: "HTG", nom: "Gourde", symbole: "G", decimales: 2 },
];

export const DEFAULT_CURRENCY_CODE = "XOF";

/** La devise d'un code, ou le franc CFA si le code est inconnu. */
export function findCurrency(code: string | null | undefined): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}
