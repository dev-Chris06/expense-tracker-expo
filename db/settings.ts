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

/** La devise a-t-elle déjà été choisie (ou fixée au premier lancement) ? */
export function hasCurrencySetting(): boolean {
  return getSetting(CURRENCY_KEY) !== null;
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
    // Toujours enregistrée, même pour le franc CFA : un choix explicite ne
    // doit jamais être remplacé par la détection du premier lancement.
    setSetting(CURRENCY_KEY, to.code);
  });
}

/* ---------- Rappel du soir ---------- */

const REMINDER_ENABLED_KEY = "rappel_actif";
const REMINDER_TIME_KEY = "rappel_heure";
const REMINDER_ASKED_KEY = "rappel_propose";

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER_TIME = { hour: 20, minute: 0 };

export function getReminderSettings(): ReminderSettings {
  const match = /^(\d{1,2}):(\d{2})$/.exec(getSetting(REMINDER_TIME_KEY) ?? "");
  const hour = match ? Number(match[1]) : DEFAULT_REMINDER_TIME.hour;
  const minute = match ? Number(match[2]) : DEFAULT_REMINDER_TIME.minute;
  const valid = hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  return {
    enabled: getSetting(REMINDER_ENABLED_KEY) === "1",
    hour: valid ? hour : DEFAULT_REMINDER_TIME.hour,
    minute: valid ? minute : DEFAULT_REMINDER_TIME.minute,
  };
}

export function setReminderEnabled(enabled: boolean): void {
  setSetting(REMINDER_ENABLED_KEY, enabled ? "1" : "0");
  setSetting(REMINDER_ASKED_KEY, "1");
}

export function setReminderTime(hour: number, minute: number): void {
  setSetting(REMINDER_TIME_KEY, `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
}

/** La carte « Un rappel le soir ? » a-t-elle déjà eu une réponse ? */
export function wasReminderOffered(): boolean {
  return getSetting(REMINDER_ASKED_KEY) === "1";
}

export function markReminderOffered(): void {
  setSetting(REMINDER_ASKED_KEY, "1");
}

/* ---------- Réglages propres à ce téléphone ----------
 * Préfixe « appareil_ » : ils ne partent pas dans les sauvegardes et une
 * restauration ne les écrase pas (un dossier choisi sur l'ancien téléphone
 * n'existe pas sur le nouveau). */

export const DEVICE_SETTING_PREFIX = "appareil_";
const BACKUP_FOLDER_KEY = `${DEVICE_SETTING_PREFIX}sauvegarde_dossier`;
const BACKUP_LAST_KEY = `${DEVICE_SETTING_PREFIX}sauvegarde_derniere`;
const BACKUP_ERROR_KEY = `${DEVICE_SETTING_PREFIX}sauvegarde_erreur`;
const SHARED_LAST_KEY = `${DEVICE_SETTING_PREFIX}envoi_dernier`;
const SHARE_SNOOZE_KEY = `${DEVICE_SETTING_PREFIX}envoi_rappel_apres`;

export interface AutoBackupState {
  /** URI du dossier choisi, ou null si la sauvegarde automatique est arrêtée. */
  folder: string | null;
  /** Date ISO de la dernière sauvegarde automatique réussie. */
  last: string | null;
  /** Message de la dernière erreur, effacé au prochain succès. */
  error: string | null;
}

export function getAutoBackupState(): AutoBackupState {
  return { folder: getSetting(BACKUP_FOLDER_KEY), last: getSetting(BACKUP_LAST_KEY), error: getSetting(BACKUP_ERROR_KEY) };
}

export function setAutoBackupFolder(uri: string | null): void {
  setSetting(BACKUP_FOLDER_KEY, uri);
  setSetting(BACKUP_ERROR_KEY, null);
  if (uri === null) setSetting(BACKUP_LAST_KEY, null);
}

export function recordAutoBackup(result: { at: string } | { error: string }): void {
  if ("at" in result) {
    setSetting(BACKUP_LAST_KEY, result.at);
    setSetting(BACKUP_ERROR_KEY, null);
  } else {
    setSetting(BACKUP_ERROR_KEY, result.error);
  }
}

/** Dernière sauvegarde envoyée hors du téléphone (partage), date ISO ou null. */
export function getLastSharedBackup(): string | null {
  return getSetting(SHARED_LAST_KEY);
}

export function recordSharedBackup(at: string): void {
  setSetting(SHARED_LAST_KEY, at);
  setSetting(SHARE_SNOOZE_KEY, null);
}

/** Date ISO avant laquelle on ne repropose pas d'envoyer une sauvegarde. */
export function getShareReminderSnooze(): string | null {
  return getSetting(SHARE_SNOOZE_KEY);
}

export function snoozeShareReminder(until: string): void {
  setSetting(SHARE_SNOOZE_KEY, until);
}

/* ---------- Accueil du premier lancement ---------- */

const WELCOME_DONE_KEY = `${DEVICE_SETTING_PREFIX}accueil_vu`;
const FIRST_STEPS_KEY = `${DEVICE_SETTING_PREFIX}premiers_pas`;

/** Les écrans d'accueil ont-ils déjà été vus (ou passés) sur ce téléphone ? */
export function isWelcomeDone(): boolean {
  return getSetting(WELCOME_DONE_KEY) === "1";
}

/**
 * Fin de l'accueil. `firstSteps` : afficher ensuite les aides de l'accueil
 * (flèche vers ＋, puis « Bravo » après la première opération). Pas après
 * une restauration : la personne connaît déjà l'app.
 */
export function markWelcomeDone(firstSteps: boolean): void {
  setSetting(WELCOME_DONE_KEY, "1");
  setSetting(FIRST_STEPS_KEY, firstSteps ? "1" : null);
}

export function hasFirstStepsPending(): boolean {
  return getSetting(FIRST_STEPS_KEY) === "1";
}

export function finishFirstSteps(): void {
  setSetting(FIRST_STEPS_KEY, null);
}
