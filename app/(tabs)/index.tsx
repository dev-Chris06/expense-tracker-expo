/**
 * Accueil : solde du mois, budgets et dernières opérations.
 * L'ajout se fait avec le ＋ de la barre d'onglets.
 */
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import BudgetBar from "@/components/BudgetBar";
import CategoryIcon from "@/components/CategoryIcon";
import TransactionRow from "@/components/TransactionRow";
import { UpdateBanner } from "@/components/Updates";
import { type Palette, useColors } from "@/constants/theme";
import { getMonthlyBudget } from "@/db/settings";
import {
  type CategoryTotal,
  getBudgetUsage,
  getMonthSummary,
  getRecentTransactions,
  type MonthSummary,
} from "@/db/transactions";
import type { Transaction } from "@/types/transaction";
import { formatCount, formatNet, formatShort } from "@/utils/formatters";
import { formatMonthLabel, greeting, monthKey } from "@/utils/months";

const EMPTY_SUMMARY: MonthSummary = { depenses: 0, revenus: 0, solde: 0, count: 0 };
const RECENT_COUNT = 5;


export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [summary, setSummary] = useState<MonthSummary>(EMPTY_SUMMARY);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryTotal[]>([]);
  const [error, setError] = useState(false);
  const month = monthKey();

  // Recharge à chaque fois que l'onglet redevient visible (retour d'un
  // ajout, d'une modification…). `active` évite de mettre à jour un écran quitté.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getMonthSummary(month), getRecentTransactions(RECENT_COUNT), getBudgetUsage(month)])
        .then(([monthSummary, latest, usage]) => {
          if (!active) return;
          setSummary(monthSummary);
          setRecent(latest);
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
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.kicker}>{greeting()}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {formatMonthLabel(month)}
          </Text>
        </View>
        {error && <Text style={styles.error}>Impossible de charger les opérations.</Text>}
        <UpdateBanner />

        <Pressable
          style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
          onPress={() => router.navigate("/stats")}
          accessibilityRole="button"
          accessibilityHint="Ouvre les statistiques du mois"
        >
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Solde du mois</Text>
            <Text style={styles.heroBadge}>{formatCount(summary.count)}</Text>
          </View>
          <Text style={styles.heroTotal} numberOfLines={1} adjustsFontSizeToFit>
            {formatNet(summary.solde)}
          </Text>
          <View style={styles.heroCells}>
            <View style={styles.heroCell}>
              <Text style={styles.heroLabel}>Revenus</Text>
              <Text style={[styles.heroValue, { color: "#A6F4C5" }]}>{formatShort(summary.revenus)}</Text>
            </View>
            <View style={styles.heroCell}>
              <Text style={styles.heroLabel}>Dépenses</Text>
              <Text style={[styles.heroValue, { color: "#FECDCA" }]}>{formatShort(summary.depenses)}</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.section}>Budgets du mois</Text>
            {hasBudgets && (
              <Pressable onPress={() => router.navigate("/settings")} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>Modifier</Text>
              </Pressable>
            )}
          </View>
          {hasBudgets ? (
            <>
              {budget !== null && <BudgetBar label="Budget global" spent={summary.depenses} budget={budget} />}
              {categoryBudgets.map((row) =>
                row.budget === null ? null : (
                  <View key={row.categorieId} style={styles.budgetRow}>
                    <CategoryIcon icon={row.icone} color={row.couleur} size={32} />
                    <View style={styles.flex}>
                      <BudgetBar label={row.categorie} spent={row.total} budget={row.budget} />
                    </View>
                  </View>
                ),
              )}
            </>
          ) : (
            <Pressable onPress={() => router.navigate("/settings")} accessibilityRole="button" style={styles.emptyButton}>
              <Text style={styles.muted}>
                Aucun budget pour l’instant. <Text style={styles.link}>Définir un budget</Text>
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.section}>Récentes</Text>
            {recent.length > 0 && (
              <Pressable onPress={() => router.navigate("/list")} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>Tout voir</Text>
              </Pressable>
            )}
          </View>
          {recent.length ? (
            recent.map((t, index) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                showDate
                divider={index < recent.length - 1}
                onPress={() => router.push(`/edit/${t.id}`)}
              />
            ))
          ) : (
            <Text style={styles.muted}>Aucune opération pour le moment. Touche ＋ pour ajouter ta première dépense.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingTop: 16, gap: 16, paddingBottom: 32 },
    flex: { flex: 1 },
    kicker: { color: c.textMuted, fontSize: 14, fontWeight: "500" },
    title: { color: c.text, fontSize: 24, fontWeight: "800" },
    error: { color: c.danger },
    pressed: { opacity: 0.85 },
    hero: { backgroundColor: c.heroBackground, borderRadius: 22, padding: 20, gap: 12 },
    heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    heroLabel: { color: c.heroTextMuted, fontSize: 14 },
    heroBadge: {
      color: c.heroTextMuted,
      fontSize: 12,
      backgroundColor: "rgba(255,255,255,0.12)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 99,
      overflow: "hidden",
    },
    heroTotal: { color: c.heroText, fontSize: 36, fontWeight: "800", fontVariant: ["tabular-nums"] },
    heroCells: { flexDirection: "row", gap: 10 },
    heroCell: { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, gap: 2 },
    heroValue: { fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    section: { color: c.text, fontSize: 16, fontWeight: "700" },
    link: { color: c.link, fontSize: 14, fontWeight: "600" },
    budgetRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    emptyButton: { minHeight: 44, justifyContent: "center" },
    muted: { color: c.textMuted, fontSize: 14, lineHeight: 20 },
  });
