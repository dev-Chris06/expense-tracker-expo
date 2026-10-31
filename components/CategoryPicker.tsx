/**
 * Sélecteur de catégorie réutilisable (add.tsx et edit/[id].tsx).
 *
 * Composant "contrôlé" : il ne stocke pas la sélection lui-même, c'est le
 * parent qui possède l'état (via les props value/onChange), comme un
 * TextInput. Ça permet au parent de lire, valider ou pré-remplir la
 * sélection librement — indispensable pour l'écran de modification.
 */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CATEGORIES, type Category } from "@/constants/categories";

interface CategoryPickerProps {
  /** Catégorie actuellement sélectionnée (null = aucune) */
  value: Category | null;
  /** Appelé quand l'utilisateur touche une catégorie */
  onChange: (category: Category) => void;
}

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <View style={styles.container}>
      {CATEGORIES.map((category) => {
        const selected = category === value;
        return (
          <TouchableOpacity
            key={category}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(category)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {category}
            </Text>
          </TouchableOpacity>
        );
      })}
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
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f5f5f5",
  },
  chipSelected: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  chipText: {
    fontSize: 14,
    color: "#333",
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
});
