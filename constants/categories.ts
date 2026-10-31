/**
 * Les 9 catégories fixes de dépenses.
 * `as const` fige le tableau : TypeScript connaît alors chaque valeur
 * littérale, ce qui permet de dériver le type `Category` ci-dessous.
 */
export const CATEGORIES = [
  "Nourriture",
  "Transport",
  "Communication",
  "Logement",
  "Études",
  "Travail",
  "Santé",
  "Loisirs",
  "Autre",
] as const;

/**
 * Type union dérivé du tableau : "Nourriture" | "Transport" | ... | "Autre".
 * Une seule source de vérité — si on modifie la liste, le type suit.
 */
export type Category = (typeof CATEGORIES)[number];
