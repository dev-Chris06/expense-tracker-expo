/**
 * Génère constants/currencyData.ts : toutes les devises en usage dans un
 * pays, avec leur nom français, leur symbole, leur nombre de décimales et
 * les pays qui les utilisent (pour la recherche « Bénin » → franc CFA).
 *
 * Sources : le paquet country-to-currency (pays → devise ISO 4217), les
 * données Unicode CLDR intégrées à Node.js (Intl) pour les noms français,
 * les symboles et les décimales, et la base des fuseaux horaires IANA
 * (zone.tab, fuseau → pays) pour deviner le pays du téléphone.
 *
 *   node scripts/generate-currencies.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

import countryToCurrency from "country-to-currency";

/** Symboles plus parlants que ceux de CLDR pour les devises les plus courantes ici. */
const SYMBOL_OVERRIDES = { XOF: "F", XAF: "F", CDF: "FC", TND: "DT", MAD: "DH", DZD: "DA", CAD: "$ CA" };
/** Noms plus courants que ceux de CLDR. */
const NAME_OVERRIDES = { XOF: "Franc CFA (UEMOA)", XAF: "Franc CFA (CEMAC)", USD: "Dollar américain" };

const currencyNames = new Intl.DisplayNames(["fr"], { type: "currency" });
const regionNames = new Intl.DisplayNames(["fr"], { type: "region", fallback: "none" });
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const countriesByCurrency = new Map();
for (const [region, code] of Object.entries(countryToCurrency)) {
  const name = regionNames.of(region);
  if (!name) continue; // ancien pays sans nom (ex. Antilles néerlandaises)
  if (!countriesByCurrency.has(code)) countriesByCurrency.set(code, []);
  countriesByCurrency.get(code).push({ region, name });
}

const currencies = [...countriesByCurrency.keys()].sort().map((code) => {
  const format = new Intl.NumberFormat("fr", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" });
  const symbol = format.formatToParts(1).find((p) => p.type === "currency").value;
  const countries = countriesByCurrency.get(code).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return {
    code,
    nom: NAME_OVERRIDES[code] ?? capitalize(currencyNames.of(code)),
    symbole: SYMBOL_OVERRIDES[code] ?? symbol,
    decimales: format.resolvedOptions().maximumFractionDigits,
    pays: countries.map((c) => c.name),
    regions: countries.map((c) => c.region),
  };
});

// Fuseau horaire → pays (« Africa/Porto-Novo » → BJ). Réglé automatiquement
// par le réseau, il est plus fiable que la langue du téléphone (souvent
// « français (France) » en Afrique francophone).
const zoneTab = readFileSync(process.env.ZONE_TAB ?? "/usr/share/zoneinfo/zone.tab", "utf8");
const timeZones = {};
for (const line of zoneTab.split("\n")) {
  if (line.startsWith("#") || !line.trim()) continue;
  const [region, , zone] = line.split("\t");
  if (countryToCurrency[region]) timeZones[zone] = region;
}
const sortedZones = Object.fromEntries(Object.entries(timeZones).sort(([a], [b]) => a.localeCompare(b)));

const out = `/* Généré par scripts/generate-currencies.mjs — ne pas modifier à la main. */
import type { Currency } from "./currencies";

export const CURRENCY_DATA: readonly Currency[] = ${JSON.stringify(currencies, null, 2)};

/** Fuseau horaire IANA → code pays ISO 3166. */
export const TIME_ZONE_REGIONS: Readonly<Record<string, string>> = ${JSON.stringify(sortedZones, null, 2)};
`;
writeFileSync(new URL("../constants/currencyData.ts", import.meta.url), out);
console.log(`${currencies.length} devises, ${Object.keys(countryToCurrency).length} pays, ${Object.keys(sortedZones).length} fuseaux`);
