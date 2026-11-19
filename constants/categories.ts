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

/**
 * Noms d'icônes Ionicons (https://icons.expo.fyi, famille Ionicons).
 * Depuis la migration v4, la colonne categories.icone contient l'un de ces noms.
 */
export const CATEGORY_ICONS = [
  "restaurant-outline",
  "cafe-outline",
  "cart-outline",
  "storefront-outline",
  "car-outline",
  "bicycle-outline",
  "bus-outline",
  "speedometer-outline",
  "phone-portrait-outline",
  "wifi-outline",
  "home-outline",
  "bulb-outline",
  "water-outline",
  "book-outline",
  "school-outline",
  "briefcase-outline",
  "medkit-outline",
  "fitness-outline",
  "shirt-outline",
  "happy-outline",
  "people-outline",
  "body-outline",
  "heart-outline",
  "gift-outline",
  "airplane-outline",
  "construct-outline",
  "receipt-outline",
  "cash-outline",
  "add-circle-outline",
  "cube-outline",
  "pricetag-outline",
] as const;

/** Icône affichée si la valeur en base n'est pas un nom Ionicons connu. */
export const FALLBACK_CATEGORY_ICON = "pricetag-outline";

export const TYPE_LABELS = { depense: "Dépense", revenu: "Revenu" } as const;
