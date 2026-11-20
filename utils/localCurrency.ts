/**
 * Devise du pays réglé dans le téléphone (Bénin → franc CFA, France → euro).
 */
import { getLocales } from "expo-localization";

import { countryName, type Currency, currencyForRegion, findCurrency } from "@/constants/currencies";

export interface LocalCurrency {
  currency: Currency;
  /** Nom du pays, si connu. */
  country: string | null;
}

export function detectLocalCurrency(): LocalCurrency | null {
  try {
    const locale = getLocales()[0];
    const byRegion = currencyForRegion(locale?.regionCode);
    if (byRegion) return { currency: byRegion, country: countryName(locale?.regionCode) };
    const code = locale?.currencyCode;
    const byCode = code ? findCurrency(code) : null;
    return byCode && byCode.code === code ? { currency: byCode, country: null } : null;
  } catch {
    return null;
  }
}
