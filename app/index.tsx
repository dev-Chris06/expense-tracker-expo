import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { UpdateBanner, UpdateFooter } from "@/components/Updates";
import { type Palette, useColors } from "@/constants/theme";
import { getLatestExpense, getMonthSummary, type MonthSummary } from "@/db/expenses";
import type { Expense } from "@/types/expense";
import { formatDisplayDate } from "@/utils/dateHelpers";
import { formatAmount, formatCount } from "@/utils/formatters";
import { formatMonthLabel, monthKey } from "@/utils/months";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [summary, setSummary] = useState<MonthSummary>({ total: 0, count: 0 });
  const [latest, setLatest] = useState<Expense | null>(null);
  const [error, setError] = useState(false);
  const month = monthKey();

  // Recharge à chaque fois que l'écran redevient visible (retour d'un ajout,
  // d'une modification…). `active` évite de mettre à jour un écran quitté.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getMonthSummary(month), getLatestExpense()])
        .then(([monthSummary, latestExpense]) => {
          if (!active) return;
          setSummary(monthSummary);
          setLatest(latestExpense);
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

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>VOTRE BUDGET</Text>
      <Text style={styles.title}>Suivi de dépenses</Text>
      {error && <Text style={styles.error}>Impossible de charger les dépenses.</Text>}
      <UpdateBanner />

      <Pressable
        style={styles.card}
        onPress={() => router.push("/stats")}
        accessibilityRole="button"
        accessibilityHint="Ouvre les statistiques du mois"
      >
        <Text style={styles.cardLabel}>Dépenses · {formatMonthLabel(month)}</Text>
        <Text style={styles.cardTotal}>{formatAmount(summary.total)}</Text>
        <Text style={styles.cardLight}>{formatCount(summary.count)}</Text>
      </Pressable>

      <Pressable style={styles.primary} onPress={() => router.push("/add")} accessibilityRole="button">
        <Text style={styles.primaryText}>＋ Ajouter une dépense</Text>
      </Pressable>
      <View style={styles.links}>
        <Pressable style={styles.secondary} onPress={() => router.push("/list")} accessibilityRole="button">
          <Text style={styles.secondaryText}>Toutes mes dépenses</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push("/stats")} accessibilityRole="button">
          <Text style={styles.secondaryText}>Statistiques</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Dernière dépense</Text>
      {latest ? (
        <Pressable
          style={styles.recent}
          onPress={() => router.push(`/edit/${latest.id}`)}
          accessibilityRole="button"
          accessibilityHint="Ouvre la dépense pour la modifier"
        >
          <View style={styles.recentMain}>
            <Text style={styles.recentTitle}>{latest.categorie}</Text>
            <Text style={styles.muted} numberOfLines={1}>
              {formatDisplayDate(latest.date)}
              {latest.note ? ` · ${latest.note}` : ""}
            </Text>
          </View>
          <Text style={styles.amount}>{formatAmount(latest.montant)}</Text>
        </Pressable>
      ) : (
        <Text style={styles.muted}>Aucune dépense pour le moment.</Text>
      )}

      <UpdateFooter />
    </ScrollView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 22, gap: 16 },
    kicker: { marginTop: 12, color: c.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1.4 },
    title: { color: c.text, fontSize: 28, fontWeight: "800" },
    error: { color: c.danger },
    card: { marginTop: 10, backgroundColor: c.heroBackground, borderRadius: 20, padding: 22, gap: 8 },
    cardLabel: { color: c.heroTextMuted, fontSize: 15 },
    cardTotal: { color: c.heroText, fontSize: 34, fontWeight: "800" },
    cardLight: { color: c.heroTextMuted, fontSize: 14 },
    primary: { backgroundColor: c.primary, padding: 17, borderRadius: 14, alignItems: "center" },
    primaryText: { color: c.onPrimary, fontWeight: "700", fontSize: 16 },
    links: { flexDirection: "row", gap: 10 },
    secondary: {
      flex: 1,
      padding: 14,
      alignItems: "center",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    secondaryText: { color: c.link, fontWeight: "700" },
    section: { marginTop: 12, fontSize: 18, fontWeight: "700", color: c.text },
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
    amount: { fontWeight: "700", color: c.text },
  });
