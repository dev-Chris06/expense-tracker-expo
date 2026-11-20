/**
 * Pavé numérique intégré (saisie rapide, budget). Touche « 000 » pour les
 * gros montants (ou « , » si la devise a des centimes), ⌫ efface un
 * chiffre, appui long sur ⌫ efface tout.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type Palette, useColors } from "@/constants/theme";
import { useCurrency } from "@/utils/currency";
import { type KeypadKey, keypadKeys } from "@/utils/keypad";

interface KeypadProps {
  onKey: (key: KeypadKey) => void;
  onClear: () => void;
  /** Touches moins hautes pour les petits écrans. */
  compact?: boolean;
}


export default function Keypad({ onKey, onClear, compact }: KeypadProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors, !!compact), [colors, compact]);
  const { decimales } = useCurrency();
  const rows = useMemo(() => {
    const keys = keypadKeys(decimales);
    return [0, 3, 6, 9].map((start) => keys.slice(start, start + 3));
  }, [decimales]);

  return (
    <View style={styles.keypad}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key}
              onPress={() => onKey(key)}
              onLongPress={key === "back" ? onClear : undefined}
              style={({ pressed }) => [styles.key, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={key === "back" ? "Effacer (appui long : tout effacer)" : key === "," ? "Virgule" : key}
            >
              {key === "back" ? (
                <Ionicons name="backspace-outline" size={26} color={colors.text} />
              ) : (
                <Text style={styles.text}>{key}</Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: Palette, compact: boolean) =>
  StyleSheet.create({
    keypad: { paddingHorizontal: 12, gap: 8 },
    row: { flexDirection: "row", gap: 8 },
    key: {
      flex: 1,
      height: compact ? 46 : 54,
      borderRadius: 14,
      backgroundColor: c.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.55 },
    text: { color: c.text, fontSize: 22, fontWeight: "600" },
  });
