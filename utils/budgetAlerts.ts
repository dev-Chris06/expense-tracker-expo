/**
 * Messages d'alerte après l'ajout d'une dépense, si elle fait franchir le
 * seuil de 80 % ou de 100 % du budget de sa catégorie ou du budget global.
 */
import { getMonthlyBudget } from "@/db/settings";
import { getBudgetUsage, getMonthSummary } from "@/db/transactions";
import type { Category, TransactionInput } from "@/types/transaction";
import { budgetPercent, crossedLevel } from "@/utils/budget";
import { formatAmount } from "@/utils/formatters";

export function budgetMessage(label: string, spent: number, budget: number, level: "warning" | "over"): string {
  return level === "over"
    ? `${label} dépassé : ${formatAmount(spent)} dépensés sur ${formatAmount(budget)}.`
    : `${label} utilisé à ${budgetPercent(spent, budget)} % (${formatAmount(spent)} sur ${formatAmount(budget)}).`;
}

/** À appeler une fois la dépense enregistrée. */
export async function budgetAlertsAfterAdd(input: TransactionInput, category: Category): Promise<string[]> {
  if (category.type !== "depense") return [];
  const month = input.date.slice(0, 7);
  const messages: string[] = [];

  if (category.budget !== null) {
    const usage = (await getBudgetUsage(month)).find((row) => row.categorieId === category.id);
    const spent = usage?.total ?? input.montant;
    const level = crossedLevel(spent - input.montant, spent, category.budget);
    if (level) messages.push(budgetMessage(`Budget ${category.icone} ${category.nom}`, spent, category.budget, level));
  }

  const monthlyBudget = getMonthlyBudget();
  if (monthlyBudget !== null) {
    const { depenses } = await getMonthSummary(month);
    const level = crossedLevel(depenses - input.montant, depenses, monthlyBudget);
    if (level) messages.push(budgetMessage("Budget du mois", depenses, monthlyBudget, level));
  }
  return messages;
}
