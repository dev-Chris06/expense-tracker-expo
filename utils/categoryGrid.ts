/**
 * Cases de la grille de catégories de la saisie rapide.
 *
 * La grille fait 3 colonnes × 3 lignes : tout doit y tenir sans défiler,
 * car le pavé numérique occupe le bas de l'écran. Avec 8 catégories ou
 * moins, on les montre toutes + « Nouvelle ». Au-delà, on montre les 7
 * plus utilisées + « Plus » + « Nouvelle » ; « Plus » déplie la grille
 * complète, qui se termine alors par « Moins ».
 */

/** Nombre de cases tenant sur l'écran sans défiler. */
export const GRID_CELLS = 9;

export type GridCell<T> =
  | { kind: "category"; category: T }
  | { kind: "more"; hidden: number }
  | { kind: "less" }
  | { kind: "new" };

export function buildCategoryGrid<T extends { id: number }>(
  choices: readonly T[],
  selectedId: number | null,
  expanded: boolean,
): GridCell<T>[] {
  const asCells = (list: readonly T[]) => list.map((category) => ({ kind: "category" as const, category }));

  if (choices.length < GRID_CELLS) return [...asCells(choices), { kind: "new" }];
  if (expanded) return [...asCells(choices), { kind: "new" }, { kind: "less" }];

  const shown = choices.slice(0, GRID_CELLS - 2);
  const selected = choices.find((c) => c.id === selectedId);
  // La catégorie choisie reste visible même si elle est peu utilisée.
  if (selected && !shown.includes(selected)) shown[shown.length - 1] = selected;
  return [...asCells(shown), { kind: "more", hidden: choices.length - shown.length }, { kind: "new" }];
}
