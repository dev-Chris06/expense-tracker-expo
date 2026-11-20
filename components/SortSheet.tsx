/**
 * Choix du tri de la liste des opérations : les trois possibilités sont
 * affichées en clair, avec une coche sur celle en cours.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Palette, useColors } from "@/constants/theme";
import { SORT_OPTIONS, type SortOrder } from "@/utils/grouping";

interface SortSheetProps {
  visible: boolean;
  value: SortOrder;
  onChange: (value: SortOrder) => void;
  onClose: () => void;
}

export default function SortSheet({ visible, value, onChange, onClose }: SortSheetProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer">
        {/* Le panneau ne ferme pas la fenêtre quand on le touche. */}
        <Pressable style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]} onPress={() => undefined}>
          <Text style={styles.title} accessibilityRole="header">
            Trier les opérations
          </Text>
          <View accessibilityRole="radiogroup">
            {SORT_OPTIONS.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    onClose();
                  }}
                  style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Ionicons name={option.icon} size={22} color={selected ? colors.primary : colors.textMuted} />
                  <View style={styles.flex}>
                    <Text style={[styles.label, selected && { color: colors.primary }]}>{option.label}</Text>
                    <Text style={styles.hint}>{option.hint}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark" size={22} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16, 24, 40, 0.45)" },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingHorizontal: 16,
      gap: 8,
    },
    title: { color: c.text, fontSize: 18, fontWeight: "800", marginHorizontal: 4, marginBottom: 4 },
    option: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14 },
    selected: { backgroundColor: `${c.primary}14` },
    pressed: { opacity: 0.7 },
    flex: { flex: 1, gap: 2 },
    label: { color: c.text, fontSize: 15, fontWeight: "700" },
    hint: { color: c.textMuted, fontSize: 13 },
  });
