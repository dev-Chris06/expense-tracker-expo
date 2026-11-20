/**
 * Devise du pays où se trouve le téléphone (Bénin → franc CFA).
 *
 * Indices, du plus fiable au moins fiable :
 * 1. le fuseau horaire (« Africa/Porto-Novo »), réglé automatiquement par
 *    le réseau mobile ;
 * 2. la région de la langue (« fr-BJ ») — souvent fausse en Afrique
 *    francophone, où beaucoup de téléphones sont en « français (France) » ;
 * 3. la devise de la langue.
 */
import { getCalendars, getLocales } from "expo-localization";

import { countryName, type Currency, currencyForRegion, findCurrency } from "@/constants/currencies";
import { TIME_ZONE_REGIONS } from "@/constants/currencyData";

export interface LocalCurrency {
  currency: Currency;
  /** Nom du pays, si connu. */
  country: string | null;
}

/** Pays d'un fuseau horaire IANA, ou null. */
export function regionForTimeZone(timeZone: string | null | undefined): string | null {
  return (timeZone && TIME_ZONE_REGIONS[timeZone]) || null;
}

export function localCurrencyFrom(hints: {
  timeZone?: string | null;
  regionCode?: string | null;
  currencyCode?: string | null;
}): LocalCurrency | null {
  for (const region of [regionForTimeZone(hints.timeZone), hints.regionCode]) {
    const currency = currencyForRegion(region);
    if (currency) return { currency, country: countryName(region) };
  }
  const code = hints.currencyCode;
  const byCode = code ? findCurrency(code) : null;
  return byCode && byCode.code === code ? { currency: byCode, country: null } : null;
}

export function detectLocalCurrency(): LocalCurrency | null {
  try {
    const locale = getLocales()[0];
    return localCurrencyFrom({
      timeZone: getCalendars()[0]?.timeZone,
      regionCode: locale?.regionCode,
      currencyCode: locale?.currencyCode,
    });
  } catch {
    return null;
  }
}
