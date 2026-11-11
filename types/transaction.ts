/** Une opération est soit une dépense, soit un revenu. */
export type TransactionType = "depense" | "revenu";

/** Une catégorie telle que stockée en base. */
export interface Category {
  id: number;
  nom: string;
  type: TransactionType;
  /** Couleur "#RRGGBB" */
  couleur: string;
  /** Emoji affiché devant le nom */
  icone: string;
  /** Masquée : absente des choix du formulaire, ses opérations restent. */
  masquee: boolean;
  position: number;
  /** Budget mensuel en FCFA (dépenses uniquement), null si aucun. */
  budget: number | null;
}

export type CategoryInput = Pick<Category, "nom" | "type" | "couleur" | "icone" | "masquee" | "budget">;

/** Une opération avec les informations de sa catégorie. */
export interface Transaction {
  id: number;
  /** Montant en FCFA, toujours positif : le sens vient du type. */
  montant: number;
  categorieId: number;
  /** Date au format ISO "YYYY-MM-DD" */
  date: string;
  /** Note optionnelle (null si absente) */
  note: string | null;
  categorie: string;
  type: TransactionType;
  couleur: string;
  icone: string;
}

/** Les données saisies pour créer ou modifier une opération. */
export type TransactionInput = Pick<Transaction, "montant" | "categorieId" | "date" | "note">;
