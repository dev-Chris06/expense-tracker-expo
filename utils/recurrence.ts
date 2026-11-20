/**
 * Calendrier des opérations récurrentes (une fois par mois).
 *
 * Fonctions pures : la base ne fait qu'appliquer ce qu'elles calculent.
 */
import { shiftMonth } from "@/utils/months";

/** Au-delà, on s'arrête : protège d'une date du téléphone complètement fausse. */
const MAX_CATCH_UP = 24;

/** Nombre de jours d'un mois "YYYY-MM". */
export function daysInMonth(month: string): number {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m, 0).getDate();
}

/** Date de l'opération dans un mois : le 31 devient le 30 en avril, le 28 ou 29 en février. */
export function occurrenceDate(month: string, day: number): string {
  return `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, "0")}`;
}

/**
 * Dates à créer pour une récurrence dont le dernier mois créé est
 * `lastMonth` : chaque mois suivant dont le jour est arrivé (aujourd'hui
 * compris), dans l'ordre.
 */
export function dueDates(lastMonth: string, day: number, today: string): string[] {
  const dates: string[] = [];
  let month = shiftMonth(lastMonth, 1);
  while (dates.length < MAX_CATCH_UP) {
    const date = occurrenceDate(month, day);
    if (date > today) break;
    dates.push(date);
    month = shiftMonth(month, 1);
  }
  return dates;
}

/**
 * Mois à considérer comme déjà fait quand on reprend une récurrence en
 * pause : pas de rattrapage des mois de pause. Si le jour du mois en cours
 * est passé, l'opération reprendra le mois prochain.
 */
export function resumeLastMonth(day: number, today: string): string {
  const month = today.slice(0, 7);
  return occurrenceDate(month, day) <= today ? month : shiftMonth(month, -1);
}

/** "Le 5 de chaque mois", "Le 1er de chaque mois". */
export function recurrenceLabel(day: number): string {
  return `Le ${day === 1 ? "1er" : day} de chaque mois`;
}
