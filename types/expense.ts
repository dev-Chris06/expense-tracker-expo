import type { Category } from "@/constants/categories";

/**
 * Une dépense telle que stockée en base (avec son id auto-généré).
 */
export interface Expense {
  id: number;
  /** Montant en FCFA */
  montant: number;
  categorie: Category;
  /** Date de la dépense au format ISO "YYYY-MM-DD" */
  date: string;
  /** Note optionnelle (null si absente) */
  note: string | null;
}

/**
 * Les données nécessaires pour créer ou mettre à jour une dépense.
 * Pas d'id : il est généré par SQLite à l'insertion.
 */
export type ExpenseInput = Omit<Expense, "id">;
