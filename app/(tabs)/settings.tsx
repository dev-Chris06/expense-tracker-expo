/**
 * Réglages : thème, accès au budget et aux catégories, version et mise à jour.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { UpdateFooter } from "@/components/Updates";
import { applyThemePreference, type Palette, useColors } from "@/constants/theme";
import { getMonthlyBudget, getThemePreference, setThemePreference, type ThemePreference } from "@/db/settings";
import { formatAmount } from "@/utils/formatters";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Comme le tél." },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);
  const [budget, setBudget] = useState<number | null>(getMonthlyBudget);

  // Le budget se modifie sur son propre écran : relu au retour.
  useFocusEffect(
    useCallback(() => {
      setBudget(getMonthlyBudget());
    }, []),
  );

  const chooseTheme = (value: ThemePreference) => {
    setTheme(value);
    setThemePreference(value);
    applyThemePreference(value);
  };

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          Réglages
        </Text>

        <Text style={styles.section}>APPARENCE</Text>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Thème</Text>
          <View style={styles.segments} accessibilityRole="radiogroup">
            {THEMES.map((t) => {
              const selected = theme === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => chooseTheme(t.value)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.section}>ARGENT</Text>
        <Pressable
          style={({ pressed }) => [styles.card, styles.linkRow, pressed && styles.pressed]}
          onPress={() => router.push("/budget")}
          accessibilityRole="button"
        >
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>Budget du mois</Text>
            <Text style={styles.hint}>
              {budget === null ? "Aucun budget : touche pour en définir un." : `${formatAmount(budget)} par mois`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.card, styles.linkRow, pressed && styles.pressed]}
          onPress={() => router.push("/categories")}
          accessibilityRole="button"
        >
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>Catégories</Text>
            <Text style={styles.hint}>Ajouter, renommer, masquer, icônes, couleurs et budgets par catégorie.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Text style={styles.section}>À PROPOS</Text>
        <View style={styles.card}>
          <UpdateFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingTop: 16, gap: 10, paddingBottom: 32 },
    flex: { flex: 1, gap: 4 },
    title: { color: c.text, fontSize: 24, fontWeight: "800", marginBottom: 4 },
    section: { marginTop: 10, marginLeft: 4, color: c.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 16,
      gap: 10,
    },
    pressed: { opacity: 0.7 },
    rowTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
    hint: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
    segments: { flexDirection: "row", backgroundColor: c.surfaceMuted, borderRadius: 10, padding: 3 },
    segment: { flex: 1, minHeight: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    segmentSelected: {
      backgroundColor: c.surface,
      elevation: 1,
      shadowColor: "#101828",
      shadowOpacity: 0.1,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    },
    segmentText: { color: c.textMuted, fontSize: 13, fontWeight: "600" },
    segmentTextSelected: { color: c.text, fontWeight: "700" },
    linkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  });
