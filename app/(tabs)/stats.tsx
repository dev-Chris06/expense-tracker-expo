/**
 * Statistiques d'un mois (navigable avec ‹ ›) : dépenses, revenus et solde,
 * répartition des dépenses par catégorie, comparaison des 6 derniers mois
 * (toucher un mois l'affiche) et quelques repères.
 */
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import CategoryIcon from "@/components/CategoryIcon";
import MonthNav from "@/components/MonthNav";
import { type Palette, useColors } from "@/constants/theme";
import {
  type CategoryTotal,
  getCategoryTotals,
  getMonthlyTotals,
  getMonthSummary,
  type MonthSummary,
  type MonthTotal,
} from "@/db/transactions";
import { formatAmount, formatNet, formatShort } from "@/utils/formatters";
import {
  changePercent,
  daysForAverage,
  formatMonthLabel,
  formatShortMonth,
  lastMonths,
  monthKey,
  percentOf,
  shiftMonth,
} from "@/utils/months";

const EMPTY: MonthSummary = { depenses: 0, revenus: 0, solde: 0, count: 0 };
const CHART_MONTHS = 6;
const CHART_HEIGHT = 120;

export default function StatsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [month, setMonth] = useState(monthKey());
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [summary, setSummary] = useState<MonthSummary>(EMPTY);
  const [previous, setPrevious] = useState<MonthSummary>(EMPTY);
  const [history, setHistory] = useState<MonthTotal[]>([]);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        getCategoryTotals(month),
        getMonthlyTotals(36),
        getMonthSummary(month),
        getMonthSummary(shiftMonth(month, -1)),
      ])
        .then(([categoryTotals, monthlyTotals, monthSummary, previousSummary]) => {
          if (!active) return;
          setCategories(categoryTotals);
          setHistory(monthlyTotals);
          setSummary(monthSummary);
          setPrevious(previousSummary);
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

  // 6 mois, mois sans opération compris. Le mois affiché n'est pas forcément
  // le dernier : on montre jusqu'à 2 mois après lui, sans dépasser le mois en cours.
  const latest = monthKey();
  const chartEnd = shiftMonth(month, 2) < latest ? shiftMonth(month, 2) : latest;
  const chart = useMemo(() => {
    const byMonth = new Map(history.map((row) => [row.month, row]));
    return lastMonths(chartEnd, CHART_MONTHS).map((m) => byMonth.get(m) ?? { month: m, depenses: 0, revenus: 0 });
  }, [history, chartEnd]);
  const chartMax = Math.max(1, ...chart.map((row) => Math.max(row.depenses, row.revenus)));

  const days = daysForAverage(month);
  const average = days > 0 ? Math.round(summary.depenses / days) : 0;
  const change = changePercent(summary.depenses, previous.depenses);

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Statistiques
        </Text>
        <MonthNav month={month} onChange={setMonth} />
        {error && <Text style={styles.error}>Impossible de charger les statistiques.</Text>}

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Dépensé en {formatMonthLabel(month)}</Text>
          <Text style={styles.heroTotal} numberOfLines={1} adjustsFontSizeToFit>
            {formatShort(summary.depenses)}
          </Text>
          <Text style={styles.heroLabel}>
            Revenus {formatShort(summary.revenus)} · Solde {formatNet(summary.solde)}
          </Text>
        </View>

        <View style={styles.tiles}>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Moyenne par jour</Text>
            <Text style={styles.tileValue}>{formatShort(average)}</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Dépenses vs {formatShortMonth(shiftMonth(month, -1)).toLowerCase()}</Text>
            <Text
              style={[
                styles.tileValue,
                change !== null && change > 0 && { color: colors.danger },
                change !== null && change < 0 && { color: colors.success },
              ]}
            >
              {change === null ? "—" : `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change)} %`}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Par catégorie</Text>
          {categories.length === 0 ? (
            <Text style={styles.muted}>Aucune dépense ce mois-ci.</Text>
          ) : (
            categories.map((row) => {
              const percent = percentOf(row.total, summary.depenses);
              return (
                <View
                  key={row.categorieId}
                  style={styles.categoryRow}
                  accessible
                  accessibilityLabel={`${row.categorie} : ${formatAmount(row.total)}, ${percent} pour cent`}
                >
                  <CategoryIcon icon={row.icone} color={row.couleur} size={36} />
                  <View style={styles.categoryMain}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {row.categorie}
                      </Text>
                      <Text style={styles.categoryValue}>
                        {formatShort(row.total)} · {percent} %
                      </Text>
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${Math.max(percent, 2)}%`, backgroundColor: row.couleur }]} />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.section}>{CHART_MONTHS} derniers mois</Text>
            <View style={styles.legend}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>Revenus</Text>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Dépenses</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {chart.map((row) => {
              const selected = row.month === month;
              return (
                <Pressable
                  key={row.month}
                  onPress={() => setMonth(row.month)}
                  style={[styles.chartColumn, selected && styles.chartSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${formatMonthLabel(row.month)} : revenus ${formatAmount(row.revenus)}, dépenses ${formatAmount(row.depenses)}`}
                >
                  <View style={styles.bars}>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(2, (row.revenus / chartMax) * CHART_HEIGHT), backgroundColor: colors.success },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(2, (row.depenses / chartMax) * CHART_HEIGHT), backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                  <Text style={[styles.chartLabel, selected && styles.chartLabelSelected]}>
                    {formatShortMonth(row.month)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Touche un mois pour afficher ses chiffres.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingTop: 16, gap: 14, paddingBottom: 32 },
    title: { color: c.text, fontSize: 24, fontWeight: "800" },
    error: { color: c.danger },
    hero: { backgroundColor: c.heroBackground, borderRadius: 20, padding: 20, gap: 6 },
    heroLabel: { color: c.heroTextMuted, fontSize: 14 },
    heroTotal: { color: c.heroText, fontSize: 32, fontWeight: "800", fontVariant: ["tabular-nums"] },
    tiles: { flexDirection: "row", gap: 10 },
    tile: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 12,
      gap: 2,
    },
    tileLabel: { color: c.textMuted, fontSize: 12 },
    tileValue: { color: c.text, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 16,
      gap: 14,
    },
    section: { color: c.text, fontSize: 16, fontWeight: "700" },
    muted: { color: c.textMuted, fontSize: 14 },
    categoryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    categoryMain: { flex: 1, gap: 6 },
    categoryHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    categoryName: { flex: 1, color: c.text, fontSize: 14, fontWeight: "600" },
    categoryValue: { color: c.textMuted, fontSize: 13, fontVariant: ["tabular-nums"] },
    track: { height: 6, borderRadius: 3, backgroundColor: c.barTrack, overflow: "hidden" },
    fill: { height: 6, borderRadius: 3 },
    chartHeader: { gap: 6 },
    legend: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 3 },
    legendText: { color: c.textMuted, fontSize: 12, marginRight: 8 },
    chart: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
    chartColumn: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 6, borderRadius: 10 },
    chartSelected: { backgroundColor: c.surfaceMuted },
    bars: { height: CHART_HEIGHT, flexDirection: "row", alignItems: "flex-end", gap: 3 },
    bar: { width: 11, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    chartLabel: { color: c.textMuted, fontSize: 12 },
    chartLabelSelected: { color: c.text, fontWeight: "700" },
    hint: { color: c.textMuted, fontSize: 12, textAlign: "center" },
  });
