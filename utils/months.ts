/**
 * Utilitaires autour des mois, manipulés sous la forme "YYYY-MM"
 * (le préfixe des dates ISO stockées en base).
 */

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/** Mois d'une date locale : 31/10/2026 → "2026-10". */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Décale un mois : shiftMonth("2026-01", -1) → "2025-12". */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(year, monthNumber - 1 + delta, 1));
}

/** "2026-10" → "Octobre 2026". */
export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${MONTH_NAMES[monthNumber - 1]} ${year}`;
}

/** Part d'un total en pourcentage entier, 0 si le total est nul. */
export function percentOf(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
