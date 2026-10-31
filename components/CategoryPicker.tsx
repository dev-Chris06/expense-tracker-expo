/**
 * Sélecteur de catégorie du formulaire (ajout et modification).
 *
 * Composant "contrôlé" : il ne stocke pas la sélection lui-même, c'est le
 * parent qui possède l'état (via les props value/onChange), comme un
 * TextInput. Ça permet au parent de lire, valider ou pré-remplir la
 * sélection librement — indispensable pour l'écran de modification.
 */
import { StyleSheet, View } from "react-native";

import Chip from "@/components/Chip";
import { CATEGORIES, type Category } from "@/constants/categories";

interface CategoryPickerProps {
  /** Catégorie actuellement sélectionnée (null = aucune) */
  value: Category | null;
  /** Appelé quand l'utilisateur touche une catégorie */
  onChange: (category: Category) => void;
}

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {CATEGORIES.map((category) => (
        <Chip
          key={category}
          label={category}
          selected={category === value}
          onPress={() => onChange(category)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flexWrap permet aux chips de passer à la ligne automatiquement
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
