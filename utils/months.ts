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

/** Les `count` mois se terminant par `month`, du plus ancien au plus récent. */
export function lastMonths(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(month, i - count + 1));
}

/** "2026-11" → "Nov." (pour les axes de graphique). */
export function formatShortMonth(month: string): string {
  return SHORT_MONTH_NAMES[Number(month.split("-")[1]) - 1];
}

const SHORT_MONTH_NAMES = [
  "Janv.",
  "Févr.",
  "Mars",
  "Avr.",
  "Mai",
  "Juin",
  "Juil.",
  "Août",
  "Sept.",
  "Oct.",
  "Nov.",
  "Déc.",
];

/**
 * Nombre de jours à prendre en compte pour une moyenne quotidienne : le mois
 * entier s'il est passé, les jours écoulés s'il est en cours, 0 s'il est futur.
 */
export function daysForAverage(month: string, today: Date = new Date()): number {
  const current = monthKey(today);
  if (month > current) return 0;
  if (month === current) return today.getDate();
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

/** Évolution en % arrondi entre deux montants, null si la base est nulle. */
export function changePercent(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

/** "Bonjour" de 5 h à 18 h, "Bonsoir" sinon. */
export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  return hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
}
