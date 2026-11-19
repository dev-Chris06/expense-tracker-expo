/**
 * Passe la catégorie tout juste créée depuis la saisie rapide à l'écran de
 * saisie, qui la sélectionne à son retour au premier plan.
 *
 * Une simple variable de module suffit : un seul écran de saisie est ouvert
 * à la fois, et la valeur est consommée (effacée) dès qu'elle est lue.
 */
import type { TransactionType } from "@/types/transaction";

export interface CreatedCategory {
  id: number;
  type: TransactionType;
}

let pending: CreatedCategory | null = null;

export function rememberCreatedCategory(category: CreatedCategory): void {
  pending = category;
}

/** Retourne la catégorie créée en attente (une seule fois), ou null. */
export function takeCreatedCategory(): CreatedCategory | null {
  const value = pending;
  pending = null;
  return value;
}
