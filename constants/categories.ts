/**
 * Choix proposés à la création ou modification d'une catégorie.
 * Les catégories elles-mêmes vivent en base (table categories, migration v3).
 */
export const CATEGORY_COLORS = [
  "#E8590C",
  "#1C7ED6",
  "#7048E8",
  "#0CA678",
  "#F59F00",
  "#495057",
  "#E03131",
  "#D6336C",
  "#2F9E44",
  "#0B7285",
  "#AE3EC9",
  "#868E96",
] as const;

export const CATEGORY_ICONS = [
  "🍲", "🚕", "📱", "🏠", "📚", "💼", "💊", "🎉", "📦",
  "💰", "🛒", "🎁", "➕", "👕", "⛽", "💡", "💧", "🎓",
  "👶", "⛪", "✈️", "🏍️", "🔧", "🤝",
] as const;

export const TYPE_LABELS = { depense: "Dépense", revenu: "Revenu" } as const;
