/**
 * Une opération dans une liste : pastille de catégorie, note (ou catégorie),
 * détail et montant signé. Toucher ouvre la modification ; un appui long
 * peut proposer la suppression.
 */
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import CategoryIcon from "@/components/CategoryIcon";
import { type Palette, useColors } from "@/constants/theme";
import type { Transaction } from "@/types/transaction";
import { formatAmount, formatShort } from "@/utils/formatters";
import { formatShortDate } from "@/utils/grouping";

interface TransactionRowProps {
  transaction: Transaction;
  /** Ajoute la date au détail (accueil) ; inutile sous un en-tête de jour. */
  showDate?: boolean;
  /** Trait de séparation sous la ligne. */
  divider?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function TransactionRow({ transaction: t, showDate, divider, onPress, onLongPress }: TransactionRowProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const title = t.note?.trim() || t.categorie;
  const detail = [t.note?.trim() ? t.categorie : null, showDate ? formatShortDate(t.date) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${t.type === "revenu" ? "revenu" : "dépense"} de ${formatAmount(t.montant)}${
        detail ? `, ${detail}` : ""
      }`}
      accessibilityHint={onLongPress ? "Touche pour modifier, appui long pour supprimer" : "Touche pour modifier"}
    >
      <CategoryIcon icon={t.icone} color={t.couleur} size={40} />
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!detail && (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>
      <Text style={[styles.amount, t.type === "revenu" && { color: colors.success }]}>
        {`${t.type === "revenu" ? "+" : "−"}${formatShort(t.montant)}`}
      </Text>
    </Pressable>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, minHeight: 60 },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    pressed: { opacity: 0.6 },
    main: { flex: 1, minWidth: 0, gap: 2 },
    title: { color: c.text, fontSize: 15, fontWeight: "600" },
    detail: { color: c.textMuted, fontSize: 13 },
    amount: { color: c.text, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  });
