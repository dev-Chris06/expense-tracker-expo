/**
 * Formate un montant entier : 1500 → "1 500 FCFA".
 *
 * Le séparateur de milliers est posé à la main (espace insécable) plutôt
 * que via Intl : le rendu est ainsi identique sur tous les moteurs JS et
 * reste prévisible dans les tests.
 */
export function formatAmount(amount: number): string {
  const digits = String(Math.round(Math.abs(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${amount < 0 ? "-" : ""}${digits} FCFA`;
}

/** "3 opérations", "1 opération", "0 opération". */
export function formatCount(count: number): string {
  return `${count} opération${count > 1 ? "s" : ""}`;
}
