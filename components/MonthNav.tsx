/**
 * Navigation entre les mois : ‹ Novembre 2026 ›, avec une ligne de détail
 * facultative. Le mois suivant est désactivé au-delà du mois en cours.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type Palette, useColors } from "@/constants/theme";
import { formatMonthLabel, monthKey, shiftMonth } from "@/utils/months";

interface MonthNavProps {
  month: string;
  onChange: (month: string) => void;
  detail?: string;
}

export default function MonthNav({ month, onChange, detail }: MonthNavProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const atCurrent = month >= monthKey();

  return (
    <View style={styles.nav}>
      <Pressable
        onPress={() => onChange(shiftMonth(month, -1))}
        style={styles.button}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Mois précédent"
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.label} accessibilityRole="header">
          {formatMonthLabel(month)}
        </Text>
        {!!detail && <Text style={styles.detail}>{detail}</Text>}
      </View>
      <Pressable
        onPress={() => onChange(shiftMonth(month, 1))}
        disabled={atCurrent}
        style={[styles.button, atCurrent && styles.disabled]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Mois suivant"
        accessibilityState={{ disabled: atCurrent }}
      >
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    button: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
    disabled: { opacity: 0.3 },
    center: { alignItems: "center", gap: 2 },
    label: { color: c.text, fontSize: 16, fontWeight: "700" },
    detail: { color: c.textMuted, fontSize: 12 },
  });
