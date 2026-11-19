/**
 * Pastille d'une catégorie : son icône dans sa couleur, sur un fond teinté
 * de la même couleur (lisible en thème clair comme sombre).
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

import { FALLBACK_CATEGORY_ICON } from "@/constants/categories";

type IconName = keyof typeof Ionicons.glyphMap;

/** Nom Ionicons valide, ou l'icône générique (ex. ancienne valeur emoji). */
export function categoryIconName(icon: string): IconName {
  return (icon in Ionicons.glyphMap ? icon : FALLBACK_CATEGORY_ICON) as IconName;
}

interface CategoryIconProps {
  icon: string;
  color: string;
  /** Côté de la pastille en points. */
  size?: number;
}

export default function CategoryIcon({ icon, color, size = 40 }: CategoryIconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        // Couleur + canal alpha hexadécimal (~15 %) : teinte légère.
        backgroundColor: `${color}26`,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessible={false}
      importantForAccessibility="no"
    >
      <Ionicons name={categoryIconName(icon)} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}
