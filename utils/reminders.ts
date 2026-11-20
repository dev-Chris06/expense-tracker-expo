/**
 * Rappel du soir : « Tu as fait le point de ta journée ? »
 *
 * Notifications locales programmées par le téléphone lui-même : pas de
 * serveur, pas d'Internet. `syncReminders()` reprogramme tout à partir des
 * réglages ; on l'appelle au démarrage, au retour dans l'app, après un ajout
 * et après un changement de réglage.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getReminderSettings } from "@/db/settings";
import { hasTransactionOn } from "@/db/transactions";
import { todayISO } from "@/utils/dateHelpers";
import { reminderDates } from "@/utils/reminderSchedule";

const CHANNEL_ID = "rappel-du-soir";
/** Ouvre la saisie quand on touche la notification. */
export const REMINDER_URL = "/add";

export const REMINDER_TITLE = "Tu as fait le point de ta journée ?";
export const REMINDER_BODY = "Note tes dépenses d'aujourd'hui, ça prend 10 secondes.";

let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady || Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Rappel du soir",
    description: "Un rappel le soir si rien n'a été noté dans la journée.",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

/** Les notifications sont-elles autorisées par le téléphone ? */
export async function notificationsAllowed(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

/** Demande l'autorisation (fenêtre d'Android 13+). Retourne true si accordée. */
export async function askNotificationPermission(): Promise<boolean> {
  await ensureChannel(); // Android 13+ ne demande la permission qu'une fois un canal créé.
  if (await notificationsAllowed()) return true;
  const status = await Notifications.requestPermissionsAsync();
  return status.granted;
}

/** Reprogramme les rappels des prochains jours d'après les réglages. */
export async function syncReminders(now: Date = new Date()): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const settings = getReminderSettings();
  if (!settings.enabled || !(await notificationsAllowed())) return;
  await ensureChannel();

  const skipToday = await hasTransactionOn(todayISO());
  for (const date of reminderDates(now, settings, skipToday)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: REMINDER_TITLE, body: REMINDER_BODY, data: { url: REMINDER_URL } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
}

/** Même chose, sans jamais faire échouer l'appelant (rappel = bonus). */
export function syncRemindersQuietly(): void {
  syncReminders().catch(() => undefined);
}
