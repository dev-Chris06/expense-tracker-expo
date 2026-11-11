/**
 * Barre de suivi d'un budget : bleue, orange à partir de 80 %, rouge une
 * fois le budget atteint.
 */
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { type Palette, useColors } from "@/constants/theme";
import { budgetLevel, budgetPercent } from "@/utils/budget";
import { formatAmount } from "@/utils/formatters";

interface BudgetBarProps {
  label: string;
  spent: number;
  budget: number;
}

export default function BudgetBar({ label, spent, budget }: BudgetBarProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const level = budgetLevel(spent, budget);
  const percent = budgetPercent(spent, budget);
  const color = level === "over" ? colors.danger : level === "warning" ? colors.warning : colors.primary;
  const remaining = budget - spent;
  const status =
    remaining >= 0 ? `Reste ${formatAmount(remaining)}` : `Dépassé de ${formatAmount(-remaining)}`;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label} : ${formatAmount(spent)} sur ${formatAmount(budget)}, ${percent} pour cent. ${status}`}
    >
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.percent, { color: level === "ok" ? colors.textMuted : color }]}>{percent} %</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(Math.max(percent, 2), 100)}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.header}>
        <Text style={styles.detail}>
          {formatAmount(spent)} / {formatAmount(budget)}
        </Text>
        <Text style={[styles.detail, level === "over" && { color: colors.danger, fontWeight: "700" }]}>{status}</Text>
      </View>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    row: { gap: 6 },
    header: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    label: { flex: 1, color: c.text, fontSize: 15, fontWeight: "600" },
    percent: { fontSize: 14, fontWeight: "700" },
    track: { height: 8, borderRadius: 4, backgroundColor: c.barTrack, overflow: "hidden" },
    fill: { height: 8, borderRadius: 4 },
    detail: { color: c.textMuted, fontSize: 13 },
  });
