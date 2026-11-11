/**
 * Réglages clé / valeur (table "settings").
 *
 * Lecture synchrone : le thème doit être connu avant le premier affichage,
 * sinon l'écran clignoterait du clair au sombre au démarrage.
 */
import { getDatabase } from "./database";

export type ThemePreference = "system" | "light" | "dark";

const THEME_KEY = "theme";
const BUDGET_KEY = "budget_mensuel";

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

/** Budget mensuel global en FCFA, ou null si aucun. */
export function getMonthlyBudget(): number | null {
  const value = Number(getSetting(BUDGET_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function setMonthlyBudget(value: number | null): void {
  setSetting(BUDGET_KEY, value === null ? null : String(value));
}
