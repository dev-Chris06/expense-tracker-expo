/**
 * Suivi des budgets : alerte à 80 % puis à 100 % du budget du mois.
 */
export type BudgetLevel = "ok" | "warning" | "over";

export const WARNING_RATIO = 0.8;

export function budgetLevel(spent: number, budget: number): BudgetLevel {
  if (spent >= budget) return "over";
  if (spent >= budget * WARNING_RATIO) return "warning";
  return "ok";
}

const RANK: Record<BudgetLevel, number> = { ok: 0, warning: 1, over: 2 };

/**
 * Niveau atteint par une nouvelle dépense, s'il est plus grave qu'avant :
 * on ne prévient qu'au franchissement d'un seuil, pas à chaque dépense.
 */
export function crossedLevel(before: number, after: number, budget: number): Exclude<BudgetLevel, "ok"> | null {
  const level = budgetLevel(after, budget);
  return level !== "ok" && RANK[level] > RANK[budgetLevel(before, budget)] ? level : null;
}

/** Part du budget utilisée, en pourcentage arrondi vers le bas. */
export function budgetPercent(spent: number, budget: number): number {
  return Math.floor((spent / budget) * 100);
}

/** Arrondit à 2 chiffres significatifs, en unités de la devise : 57 500 → 58 000. */
export function roundNice(amount: number, decimals: number): number {
  const factor = 10 ** decimals;
  const major = amount / factor;
  if (major <= 0) return 0;
  const step = 10 ** Math.max(0, Math.floor(Math.log10(major)) - 1);
  return Math.round(major / step) * step * factor;
}

/**
 * Budgets proposés d'après les dépenses des derniers mois : un peu moins
 * que d'habitude (pour épargner), comme d'habitude, et un peu plus.
 * Rien à proposer sans historique.
 */
export function budgetSuggestions(pastMonthlySpending: readonly number[], decimals: number): number[] {
  const months = pastMonthlySpending.filter((v) => v > 0);
  if (months.length === 0) return [];
  const average = months.reduce((a, b) => a + b, 0) / months.length;
  const values = [0.8, 1, 1.2].map((ratio) => roundNice(average * ratio, decimals)).filter((v) => v > 0);
  return [...new Set(values)];
}
