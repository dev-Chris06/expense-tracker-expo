/**
 * Réglages : thème, budget global, accès aux catégories, version et mise à jour.
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import Chip from "@/components/Chip";
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
  { value: "system", label: "Comme le téléphone" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);
  const [savedBudget, setSavedBudget] = useState<number | null>(getMonthlyBudget);
  const [budgetText, setBudgetText] = useState(savedBudget === null ? "" : String(savedBudget));
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
      setSavedBudget(result.value);
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
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.section}>Apparence</Text>
      <View style={styles.panel}>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {THEMES.map((t) => (
            <Chip key={t.value} label={t.label} selected={theme === t.value} onPress={() => chooseTheme(t.value)} />
          ))}
        </View>
      </View>

      <Text style={styles.section}>Budget global du mois</Text>
      <View style={styles.panel}>
        <Text style={styles.hint}>
          Plafond pour l’ensemble de tes dépenses du mois. Tu es prévenu à 80 % puis à 100 %. Laisse vide pour ne pas
          avoir de budget.
        </Text>
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
        {budgetMessage && (
          <Text style={budgetMessage.error ? styles.error : styles.success} accessibilityRole="alert">
            {budgetMessage.text}
          </Text>
        )}
        <Pressable style={styles.button} onPress={saveBudget} accessibilityRole="button">
          <Text style={styles.buttonText}>Enregistrer le budget</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Catégories</Text>
      <Pressable
        style={[styles.panel, styles.row]}
        onPress={() => router.push("/categories")}
        accessibilityRole="button"
      >
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>Gérer les catégories</Text>
          <Text style={styles.hint}>Ajouter, renommer, masquer, couleurs, icônes et budgets par catégorie.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Text style={styles.section}>Application</Text>
      <View style={styles.panel}>
        <UpdateFooter />
      </View>
    </ScrollView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 18, gap: 10, paddingBottom: 40 },
    section: { marginTop: 14, fontSize: 18, fontWeight: "700", color: c.text },
    panel: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 12 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    hint: { color: c.textMuted, fontSize: 13 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      backgroundColor: c.background,
      color: c.text,
    },
    error: { color: c.danger, fontSize: 14 },
    success: { color: c.success, fontSize: 14 },
    button: { backgroundColor: c.primary, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
    buttonText: { color: c.onPrimary, fontWeight: "700", fontSize: 15 },
    row: { flexDirection: "row", alignItems: "center" },
    rowMain: { flex: 1, gap: 4 },
    rowTitle: { color: c.text, fontSize: 16, fontWeight: "600" },
    chevron: { color: c.textMuted, fontSize: 26, marginLeft: 8 },
  });
