/**
 * Réglages clé / valeur (table "settings").
 *
 * Lecture synchrone : le thème doit être connu avant le premier affichage,
 * sinon l'écran clignoterait du clair au sombre au démarrage.
 */
import { type Currency, findCurrency } from "@/constants/currencies";

import { getDatabase } from "./database";

export type ThemePreference = "system" | "light" | "dark";

const THEME_KEY = "theme";
const BUDGET_KEY = "budget_mensuel";
const CURRENCY_KEY = "devise";

function getSetting(key: string): string | null {
  return getDatabase().getFirstSync<{ valeur: string }>("SELECT valeur FROM settings WHERE cle = ?", key)?.valeur ?? null;
}

function setSetting(key: string, value: string | null): void {
  if (value === null) {
    getDatabase().runSync("DELETE FROM settings WHERE cle = ?", key);
  } else {
    getDatabase().runSync(
      "INSERT INTO settings (cle, valeur) VALUES (?, ?) ON CONFLICT (cle) DO UPDATE SET valeur = excluded.valeur",
      key,
      value,
    );
  }
}

export function getThemePreference(): ThemePreference {
  const value = getSetting(THEME_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

export function setThemePreference(value: ThemePreference): void {
  setSetting(THEME_KEY, value === "system" ? null : value);
}

/** Budget mensuel global (plus petite unité de la devise), ou null si aucun. */
export function getMonthlyBudget(): number | null {
  const value = Number(getSetting(BUDGET_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function setMonthlyBudget(value: number | null): void {
  setSetting(BUDGET_KEY, value === null ? null : String(value));
}

/** Code de la devise choisie (franc CFA par défaut). */
export function getCurrencyCode(): string {
  return findCurrency(getSetting(CURRENCY_KEY)).code;
}

/**
 * Change de devise. Les montants gardent les chiffres que l'utilisateur a
 * tapés (5 000 F deviennent 5 000 €, pas de taux de change) : comme ils sont
 * stockés dans la plus petite unité, on les multiplie (ou divise) par la
 * différence de décimales. Tout ou rien, dans une transaction.
 */
export function changeCurrency(from: Currency, to: Currency): void {
  const exponent = to.decimales - from.decimales;
  const db = getDatabase();
  db.withTransactionSync(() => {
    if (exponent !== 0) {
      const scaled = (column: string) => `MAX(1, CAST(ROUND(${column} * ${10 ** exponent}) AS INTEGER))`;
      db.runSync(`UPDATE transactions SET montant = ${scaled("montant")}`);
      db.runSync(`UPDATE recurrences SET montant = ${scaled("montant")}`);
      db.runSync(`UPDATE categories SET budget = ${scaled("budget")} WHERE budget IS NOT NULL`);
      db.runSync(
        `UPDATE settings SET valeur = CAST(${scaled("CAST(valeur AS INTEGER)")} AS TEXT) WHERE cle = ?`,
        BUDGET_KEY,
      );
    }
    setSetting(CURRENCY_KEY, to.code === findCurrency(null).code ? null : to.code);
  });
}
