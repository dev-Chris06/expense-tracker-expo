/**
 * Réglages : thème, budget global, accès aux catégories, version et mise à jour.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { UpdateFooter } from "@/components/Updates";
import { applyThemePreference, type Palette, useColors } from "@/constants/theme";
import {
  getMonthlyBudget,
  getThemePreference,
  setMonthlyBudget,
  setThemePreference,
  type ThemePreference,
} from "@/db/settings";
import { formatAmount } from "@/utils/formatters";
import { parseOptionalBudget } from "@/utils/validation";

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
  const [budgetText, setBudgetText] = useState(() => {
    const saved = getMonthlyBudget();
    return saved === null ? "" : String(saved);
  });
  const [budgetMessage, setBudgetMessage] = useState<{ text: string; error: boolean } | null>(null);

  const chooseTheme = (value: ThemePreference) => {
    setTheme(value);
    setThemePreference(value);
    applyThemePreference(value);
  };

  const saveBudget = () => {
    const result = parseOptionalBudget(budgetText);
    if (result.error !== null) {
      setBudgetMessage({ text: result.error, error: true });
      return;
    }
    try {
      setMonthlyBudget(result.value);
      setBudgetText(result.value === null ? "" : String(result.value));
      setBudgetMessage({
        text: result.value === null ? "Budget global supprimé." : `Budget global : ${formatAmount(result.value)} par mois.`,
        error: false,
      });
    } catch {
      setBudgetMessage({ text: "Enregistrement impossible. Réessaie.", error: true });
    }
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
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Budget global du mois</Text>
          <Text style={styles.hint}>
            Plafond pour toutes tes dépenses du mois. Tu es prévenu à 80 % puis à 100 %. Laisse vide pour ne pas avoir
            de budget.
          </Text>
          <View style={styles.budgetRow}>
            <TextInput
              style={styles.input}
              value={budgetText}
              onChangeText={(text) => {
                setBudgetText(text);
                setBudgetMessage(null);
              }}
              placeholder="Ex. 150 000"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              accessibilityLabel="Budget global du mois en francs CFA"
            />
            <Pressable style={styles.button} onPress={saveBudget} accessibilityRole="button">
              <Text style={styles.buttonText}>Enregistrer</Text>
            </Pressable>
          </View>
          {budgetMessage && (
            <Text style={budgetMessage.error ? styles.error : styles.success} accessibilityRole="alert">
              {budgetMessage.text}
            </Text>
          )}
        </View>
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
    budgetRow: { flexDirection: "row", gap: 8 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 16,
      backgroundColor: c.background,
      color: c.text,
    },
    button: { backgroundColor: c.primary, borderRadius: 12, paddingHorizontal: 16, minHeight: 46, justifyContent: "center" },
    buttonText: { color: c.onPrimary, fontWeight: "700", fontSize: 15 },
    error: { color: c.danger, fontSize: 14 },
    success: { color: c.success, fontSize: 14 },
    linkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  });
