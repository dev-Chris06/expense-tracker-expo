/**
 * Dates des prochains rappels du soir (fonction pure, testée).
 *
 * Les rappels sont programmés plusieurs jours à l'avance : ils sonnent même
 * si l'app n'est pas ouverte pendant une semaine. Celui du jour est sauté si
 * une opération a déjà été notée aujourd'hui.
 */

/** Nombre de jours programmés d'avance. */
export const REMINDER_DAYS_AHEAD = 7;

export function reminderDates(
  now: Date,
  time: { hour: number; minute: number },
  skipToday: boolean,
  days: number = REMINDER_DAYS_AHEAD,
): Date[] {
  const dates: Date[] = [];
  for (let offset = 0; dates.length < days && offset <= days; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, time.hour, time.minute, 0, 0);
    if (offset === 0 && (skipToday || date <= now)) continue;
    dates.push(date);
  }
  return dates;
}

/** « 20 h », « 20 h 30 » */
export function formatReminderTime(time: { hour: number; minute: number }): string {
  return time.minute === 0 ? `${time.hour} h` : `${time.hour} h ${String(time.minute).padStart(2, "0")}`;
}
