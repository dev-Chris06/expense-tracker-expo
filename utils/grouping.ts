/**
 * Tri des opérations et regroupement par jour pour la liste.
 */
import type { Transaction } from "@/types/transaction";
import { todayISO, toISODate } from "@/utils/dateHelpers";

export type SortOrder = "recent" | "oldest" | "amount";

export const SORT_LABELS: Record<SortOrder, string> = {
  recent: "Plus récentes",
  oldest: "Plus anciennes",
  amount: "Plus gros montants",
};

/** Ordre suivant quand on touche le bouton de tri. */
export function nextSortOrder(order: SortOrder): SortOrder {
  return order === "recent" ? "oldest" : order === "oldest" ? "amount" : "recent";
}

/** Copie triée ; à égalité, l'opération saisie en dernier passe devant. */
export function sortTransactions(rows: readonly Transaction[], order: SortOrder): Transaction[] {
  return [...rows].sort((a, b) => {
    if (order === "amount") return b.montant - a.montant || b.id - a.id;
    const byDate = a.date.localeCompare(b.date) || a.id - b.id;
    return order === "recent" ? -byDate : byDate;
  });
}

export interface DaySection {
  /** Date ISO "YYYY-MM-DD" */
  date: string;
  /** Revenus − dépenses du jour (dans la sélection affichée). */
  total: number;
  data: Transaction[];
}

/** Regroupe des opérations déjà triées par date en sections d'un jour. */
export function groupByDay(rows: readonly Transaction[]): DaySection[] {
  const sections: DaySection[] = [];
  const byDate = new Map<string, DaySection>();
  for (const row of rows) {
    let section = byDate.get(row.date);
    if (!section) {
      section = { date: row.date, total: 0, data: [] };
      byDate.set(row.date, section);
      sections.push(section);
    }
    section.data.push(row);
    section.total += row.type === "revenu" ? row.montant : -row.montant;
  }
  return sections;
}

const WEEKDAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function parseISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** "mer. 19 nov." (l'année est ajoutée si ce n'est pas celle de `today`). */
export function formatShortDate(iso: string, today: string = todayISO()): string {
  const date = parseISO(iso);
  const label = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return iso.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${date.getFullYear()}`;
}

/** En-tête de jour : "Aujourd’hui · mer. 19 nov.", "Hier · …" ou "Lun. 17 nov.". */
export function dayLabel(iso: string, today: string = todayISO()): string {
  const short = formatShortDate(iso, today);
  if (iso === today) return `Aujourd’hui · ${short}`;
  const yesterday = parseISO(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === toISODate(yesterday)) return `Hier · ${short}`;
  return short.charAt(0).toUpperCase() + short.slice(1);
}
