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
import type { Category } from "@/types/transaction";

interface CategoryPickerProps {
  categories: Category[];
  /** Id de la catégorie sélectionnée (null = aucune) */
  value: number | null;
  /** Appelé quand l'utilisateur touche une catégorie */
  onChange: (categoryId: number) => void;
}

export default function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {categories.map((category) => (
        <Chip
          key={category.id}
          label={`${category.icone} ${category.nom}`}
          selected={category.id === value}
          onPress={() => onChange(category.id)}
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
