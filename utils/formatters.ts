export function formatAmount(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(amount)} FCFA`;
}
