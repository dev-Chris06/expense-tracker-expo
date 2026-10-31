/**
 * Pastille sélectionnable, utilisée par le sélecteur de catégorie du
 * formulaire et par les filtres de la liste (un seul style pour les deux).
 */
import { Pressable, StyleSheet, Text } from "react-native";

import { useColors } from "@/constants/theme";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function Chip({ label, selected, onPress }: ChipProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={4}
      style={[
        styles.chip,
        { backgroundColor: colors.surface, borderColor: colors.border },
        selected && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
    >
      <Text style={[styles.text, { color: selected ? colors.onPrimary : colors.text }, selected && styles.textSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  text: { fontSize: 14 },
  textSelected: { fontWeight: "600" },
});
