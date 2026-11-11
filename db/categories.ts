/**
 * Accès à la table "categories".
 *
 * Une catégorie n'est jamais supprimée, seulement masquée : les opérations
 * passées gardent ainsi leur catégorie et les statistiques restent justes.
 */
import type { Category, CategoryInput, TransactionType } from "@/types/transaction";
import { UserFacingError } from "@/utils/errors";

import { getDatabase } from "./database";

interface CategoryRow extends Omit<Category, "masquee"> {
  masquee: number;
}

const toCategory = (row: CategoryRow): Category => ({ ...row, masquee: row.masquee === 1 });

/** Catégories d'un type (ou toutes), dans l'ordre d'affichage. */
export async function getCategories(
  options: { type?: TransactionType; includeHidden?: boolean } = {},
): Promise<Category[]> {
  const conditions: string[] = [];
  const params: string[] = [];
  if (options.type) {
    conditions.push("type = ?");
    params.push(options.type);
  }
  if (!options.includeHidden) conditions.push("masquee = 0");
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await getDatabase().getAllAsync<CategoryRow>(
    `SELECT * FROM categories ${where} ORDER BY type, position, nom`,
    ...params,
  );
  return rows.map(toCategory);
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const row = await getDatabase().getFirstAsync<CategoryRow>("SELECT * FROM categories WHERE id = ?", id);
  return row ? toCategory(row) : null;
}

/** Erreur SQLite de contrainte UNIQUE → message compréhensible. */
function rethrow(error: unknown): never {
  if (String(error).includes("UNIQUE")) {
    throw new UserFacingError("Une catégorie porte déjà ce nom.");
  }
  throw error;
}

/** Crée une catégorie, placée après les autres du même type. */
export async function addCategory(input: CategoryInput): Promise<number> {
  try {
    const result = await getDatabase().runAsync(
      `INSERT INTO categories (nom, type, couleur, icone, masquee, budget, position)
       VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM categories WHERE type = ?))`,
      input.nom,
      input.type,
      input.couleur,
      input.icone,
      input.masquee ? 1 : 0,
      input.type === "depense" ? input.budget : null,
      input.type,
    );
    return result.lastInsertRowId;
  } catch (error) {
    rethrow(error);
  }
}

/**
 * Modifie une catégorie. Son type ne change pas : les opérations déjà
 * classées dedans changeraient de sens (dépense ↔ revenu).
 */
export async function updateCategory(id: number, input: Omit<CategoryInput, "type">): Promise<boolean> {
  try {
    const result = await getDatabase().runAsync(
      `UPDATE categories SET nom = ?, couleur = ?, icone = ?, masquee = ?,
         budget = CASE WHEN type = 'depense' THEN ? ELSE NULL END
       WHERE id = ?`,
      input.nom,
      input.couleur,
      input.icone,
      input.masquee ? 1 : 0,
      input.budget,
      id,
    );
    return result.changes > 0;
  } catch (error) {
    rethrow(error);
  }
}
