/**
 * Devises proposées dans les réglages (une seule devise par utilisateur).
 *
 * Toutes les devises en usage dans au moins un pays (voir currencyData.ts,
 * généré par scripts/generate-currencies.mjs). Les montants sont stockés en
 * entiers dans la plus petite unité de la devise : des francs CFA (pas de
 * centimes), des centimes d'euro, etc.
 */
import { CURRENCY_DATA } from "./currencyData";

export interface Currency {
  /** Code ISO 4217 */
  code: string;
  nom: string;
  /** Affiché après le montant : « 1 500 F », « 12,50 € ». */
  symbole: string;
  /** Chiffres après la virgule (0, 2 ou 3). */
  decimales: number;
  /** Pays qui l'utilisent (noms français), pour la recherche. */
  pays: readonly string[];
  /** Codes pays ISO 3166 correspondants. */
  regions: readonly string[];
}

export const DEFAULT_CURRENCY_CODE = "XOF";

/** Par ordre alphabétique de nom. */
export const CURRENCIES: readonly Currency[] = [...CURRENCY_DATA].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

/** La devise d'un code, ou le franc CFA si le code est inconnu. */
export function findCurrency(code: string | null | undefined): Currency {
  return (code ? BY_CODE.get(code) : undefined) ?? BY_CODE.get(DEFAULT_CURRENCY_CODE)!;
}

/** Devise d'un pays (code ISO 3166, ex. "BJ"), ou null. */
export function currencyForRegion(region: string | null | undefined): Currency | null {
  if (!region) return null;
  const upper = region.toUpperCase();
  return CURRENCIES.find((c) => c.regions.includes(upper)) ?? null;
}

/** Nom français d'un pays par son code, ou null. */
export function countryName(region: string | null | undefined): string | null {
  if (!region) return null;
  const upper = region.toUpperCase();
  for (const c of CURRENCIES) {
    const index = c.regions.indexOf(upper);
    if (index >= 0) return c.pays[index];
  }
  return null;
}
