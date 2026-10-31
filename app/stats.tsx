/**
 * Statistiques : répartition par catégorie pour un mois donné (navigable
 * avec ‹ ›) et historique des totaux mensuels. Toucher un mois de
 * l'historique l'affiche en haut.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { type Palette, useColors } from "@/constants/theme";
import { type CategoryTotal, getCategoryTotals, getMonthlyTotals, type MonthTotal } from "@/db/expenses";
import { formatAmount, formatCount } from "@/utils/formatters";
import { formatMonthLabel, monthKey, percentOf, shiftMonth } from "@/utils/months";

export default function StatsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const currentMonth = monthKey();
  const [month, setMonth] = useState(currentMonth);
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [history, setHistory] = useState<MonthTotal[]>([]);
  const [error, setError] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getCategoryTotals(month), getMonthlyTotals(12)])
        .then(([categoryTotals, monthlyTotals]) => {
          if (!active) return;
          setCategories(categoryTotals);
          setHistory(monthlyTotals);
          setError(false);
        })
        .catch(() => {
          if (active) setError(true);
        });
      return () => {
        active = false;
      };
    }, [month]),
  );

  const total = categories.reduce((sum, row) => sum + row.total, 0);
  const count = categories.reduce((sum, row) => sum + row.count, 0);
  const maxMonthly = Math.max(0, ...history.map((row) => row.total));
  const isCurrentMonth = month >= currentMonth;

  return (
    <ScrollView ref={scrollRef} style={styles.page} contentContainerStyle={styles.content}>
      {error && <Text style={styles.error}>Impossible de charger les statistiques.</Text>}
      <Text style={styles.muted}>
        Combien tu as dépensé chaque mois, et pour quoi. Change de mois avec les flèches ‹ ›.
      </Text>

      <View style={styles.monthNav}>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, -1))}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel} accessibilityRole="header">
          {formatMonthLabel(month)}
        </Text>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, 1))}
          disabled={isCurrentMonth}
          style={[styles.navButton, isCurrentMonth && styles.navDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
          accessibilityState={{ disabled: isCurrentMonth }}
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLight}>Total dépensé en {formatMonthLabel(month)}</Text>
        <Text style={styles.cardTotal}>{formatAmount(total)}</Text>
        <Text style={styles.cardLight}>{formatCount(count)}</Text>
      </View>

      <Text style={styles.section}>Par catégorie</Text>
      <Text style={styles.hint}>Part de chaque catégorie dans le total du mois, de la plus grosse à la plus petite.</Text>
      {categories.length === 0 ? (
        <Text style={styles.muted}>Aucune dépense ce mois-ci.</Text>
      ) : (
        <View style={styles.panel}>
          {categories.map((row) => {
            const percent = percentOf(row.total, total);
            return (
              <View
                key={row.categorie}
                style={styles.barRow}
                accessible
                accessibilityLabel={`${row.categorie} : ${formatAmount(row.total)}, ${percent} pour cent`}
              >
                <View style={styles.barHeader}>
                  <Text style={styles.barLabel}>{row.categorie}</Text>
                  <Text style={styles.barValue}>
                    {formatAmount(row.total)} · {percent} %
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(percent, 2)}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.section}>Historique mensuel</Text>
      <Text style={styles.hint}>
        Total de chacun des 12 derniers mois avec des dépenses. Touche un mois pour afficher son détail en haut.
      </Text>
      {history.length === 0 ? (
        <Text style={styles.muted}>Pas encore d’historique.</Text>
      ) : (
        <View style={styles.panel}>
          {history.map((row) => {
            const selected = row.month === month;
            return (
              <Pressable
                key={row.month}
                onPress={() => {
                  setMonth(row.month);
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
                style={[styles.historyRow, selected && styles.historySelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${formatMonthLabel(row.month)} : ${formatAmount(row.total)}, ${formatCount(row.count)}`}
              >
                <View style={styles.barHeader}>
                  <Text style={[styles.barLabel, selected && styles.historyLabelSelected]}>
                    {formatMonthLabel(row.month)}
                  </Text>
                  <Text style={styles.barValue}>{formatAmount(row.total)}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, { width: `${Math.max(percentOf(row.total, maxMonthly), 2)}%` }]}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 18, gap: 14 },
    error: { color: c.danger },
    monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    navButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    navDisabled: { opacity: 0.35 },
    navText: { fontSize: 24, color: c.text, lineHeight: 28 },
    monthLabel: { fontSize: 20, fontWeight: "700", color: c.text },
    card: { backgroundColor: c.heroBackground, borderRadius: 20, padding: 20, gap: 6 },
    cardTotal: { color: c.heroText, fontSize: 30, fontWeight: "800" },
    cardLight: { color: c.heroTextMuted, fontSize: 14 },
    section: { marginTop: 8, fontSize: 18, fontWeight: "700", color: c.text },
    hint: { marginTop: -8, color: c.textMuted, fontSize: 13 },
    muted: { color: c.textMuted, fontSize: 14 },
    panel: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 14 },
    barRow: { gap: 6 },
    barHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    barLabel: { color: c.text, fontSize: 15, fontWeight: "600" },
    barValue: { color: c.textMuted, fontSize: 14 },
    barTrack: { height: 8, borderRadius: 4, backgroundColor: c.barTrack, overflow: "hidden" },
    barFill: { height: 8, borderRadius: 4, backgroundColor: c.primary },
    historyRow: { gap: 6, padding: 8, marginHorizontal: -8, borderRadius: 10 },
    historySelected: { backgroundColor: c.barTrack },
    historyLabelSelected: { color: c.link },
  });
