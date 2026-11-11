import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import BudgetBar from "@/components/BudgetBar";
import { UpdateBanner } from "@/components/Updates";
import { type Palette, useColors } from "@/constants/theme";
import { getMonthlyBudget } from "@/db/settings";
import {
  type CategoryTotal,
  getBudgetUsage,
  getLatestTransaction,
  getMonthSummary,
  type MonthSummary,
} from "@/db/transactions";
import type { Transaction } from "@/types/transaction";
import { formatDisplayDate } from "@/utils/dateHelpers";
import { formatAmount, formatCount, formatSignedAmount } from "@/utils/formatters";
import { formatMonthLabel, monthKey } from "@/utils/months";

const EMPTY_SUMMARY: MonthSummary = { depenses: 0, revenus: 0, solde: 0, count: 0 };

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [summary, setSummary] = useState<MonthSummary>(EMPTY_SUMMARY);
  const [latest, setLatest] = useState<Transaction | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryTotal[]>([]);
  const [error, setError] = useState(false);
  const month = monthKey();

  // Recharge à chaque fois que l'écran redevient visible (retour d'un ajout,
  // d'une modification, des réglages…). `active` évite de mettre à jour un
  // écran quitté.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getMonthSummary(month), getLatestTransaction(), getBudgetUsage(month)])
        .then(([monthSummary, latestTransaction, usage]) => {
          if (!active) return;
          setSummary(monthSummary);
          setLatest(latestTransaction);
          setCategoryBudgets(usage);
          setBudget(getMonthlyBudget());
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

  const hasBudgets = budget !== null || categoryBudgets.length > 0;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={10}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Réglages"
            >
              <Text style={styles.headerIcon}>⚙️</Text>
            </Pressable>
          ),
        }}
      />
      <Text style={styles.kicker}>VOTRE BUDGET</Text>
      <Text style={styles.title}>Suivi de dépenses</Text>
      {error && <Text style={styles.error}>Impossible de charger les opérations.</Text>}
      <UpdateBanner />

      <Pressable
        style={styles.card}
        onPress={() => router.push("/stats")}
        accessibilityRole="button"
        accessibilityHint="Ouvre les statistiques du mois"
      >
        <Text style={styles.cardLabel}>Solde · {formatMonthLabel(month)}</Text>
        <Text style={styles.cardTotal}>{formatAmount(summary.solde)}</Text>
        <View style={styles.cardRow}>
          <View style={styles.cardCell}>
            <Text style={styles.cardLight}>Revenus</Text>
            <Text style={styles.cardValue}>{formatAmount(summary.revenus)}</Text>
          </View>
          <View style={styles.cardCell}>
            <Text style={styles.cardLight}>Dépenses</Text>
            <Text style={styles.cardValue}>{formatAmount(summary.depenses)}</Text>
          </View>
        </View>
        <Text style={styles.cardLight}>{formatCount(summary.count)}</Text>
      </Pressable>

      <View style={styles.links}>
        <Pressable style={styles.primary} onPress={() => router.push("/add")} accessibilityRole="button">
          <Text style={styles.primaryText}>＋ Dépense</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, styles.income]}
          onPress={() => router.push({ pathname: "/add", params: { type: "revenu" } })}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>＋ Revenu</Text>
        </Pressable>
      </View>
      <View style={styles.links}>
        <Pressable style={styles.secondary} onPress={() => router.push("/list")} accessibilityRole="button">
          <Text style={styles.secondaryText}>Toutes mes opérations</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push("/stats")} accessibilityRole="button">
          <Text style={styles.secondaryText}>Statistiques</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Budgets du mois</Text>
      {hasBudgets ? (
        <View style={styles.panel}>
          {budget !== null && <BudgetBar label="Budget global" spent={summary.depenses} budget={budget} />}
          {categoryBudgets.map((row) =>
            row.budget === null ? null : (
              <BudgetBar
                key={row.categorieId}
                label={`${row.icone} ${row.categorie}`}
                spent={row.total}
                budget={row.budget}
              />
            ),
          )}
        </View>
      ) : (
        <Pressable onPress={() => router.push("/settings")} accessibilityRole="button">
          <Text style={styles.muted}>
            Aucun budget défini. <Text style={styles.linkText}>Définir un budget</Text>
          </Text>
        </Pressable>
      )}

      <Text style={styles.section}>Dernière opération</Text>
      {latest ? (
        <Pressable
          style={styles.recent}
          onPress={() => router.push(`/edit/${latest.id}`)}
          accessibilityRole="button"
          accessibilityHint="Ouvre l’opération pour la modifier"
        >
          <View style={styles.recentMain}>
            <Text style={styles.recentTitle}>
              {latest.icone} {latest.categorie}
            </Text>
            <Text style={styles.muted} numberOfLines={1}>
              {formatDisplayDate(latest.date)}
              {latest.note ? ` · ${latest.note}` : ""}
            </Text>
          </View>
          <Text style={[styles.amount, latest.type === "revenu" && { color: colors.success }]}>
            {formatSignedAmount(latest.montant, latest.type)}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.muted}>Aucune opération pour le moment.</Text>
      )}
    </ScrollView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 22, gap: 16, paddingBottom: 40 },
    headerButton: { paddingHorizontal: 8, minHeight: 44, justifyContent: "center" },
    headerIcon: { fontSize: 22 },
    kicker: { marginTop: 12, color: c.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1.4 },
    title: { color: c.text, fontSize: 28, fontWeight: "800" },
    error: { color: c.danger },
    card: { marginTop: 10, backgroundColor: c.heroBackground, borderRadius: 20, padding: 22, gap: 8 },
    cardLabel: { color: c.heroTextMuted, fontSize: 15 },
    cardTotal: { color: c.heroText, fontSize: 34, fontWeight: "800" },
    cardRow: { flexDirection: "row", gap: 12, marginTop: 4 },
    cardCell: { flex: 1, gap: 2 },
    cardValue: { color: c.heroText, fontSize: 16, fontWeight: "700" },
    cardLight: { color: c.heroTextMuted, fontSize: 14 },
    primary: { flex: 1, backgroundColor: c.primary, padding: 17, borderRadius: 14, alignItems: "center" },
    income: { backgroundColor: c.success },
    primaryText: { color: c.onPrimary, fontWeight: "700", fontSize: 16 },
    links: { flexDirection: "row", gap: 10 },
    secondary: {
      flex: 1,
      padding: 14,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    secondaryText: { color: c.link, fontWeight: "700", textAlign: "center" },
    section: { marginTop: 12, fontSize: 18, fontWeight: "700", color: c.text },
    panel: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 16 },
    recent: {
      padding: 16,
      backgroundColor: c.surface,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    recentMain: { flex: 1 },
    recentTitle: { fontWeight: "700", fontSize: 16, marginBottom: 5, color: c.text },
    muted: { color: c.textMuted, fontSize: 14 },
    linkText: { color: c.link, fontWeight: "700" },
    amount: { fontWeight: "700", color: c.text },
  });
