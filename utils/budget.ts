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
