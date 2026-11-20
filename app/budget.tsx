/**
 * Budget global du mois : plafond pour toutes les dépenses, saisi avec le
 * pavé numérique. Ouvert depuis l'accueil et depuis les réglages.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import Keypad from "@/components/Keypad";
import { type Palette, useColors } from "@/constants/theme";
import { getMonthlyBudget, setMonthlyBudget } from "@/db/settings";
import { getMonthlyTotals, getMonthSummary } from "@/db/transactions";
import { budgetPercent, budgetSuggestions } from "@/utils/budget";
import { useCurrency } from "@/utils/currency";
import { formatShort } from "@/utils/formatters";
import { formatDigits, pressKey, toKeypadText } from "@/utils/keypad";
import { formatMonthLabel, monthKey } from "@/utils/months";
import { parseAmount } from "@/utils/validation";

export default function BudgetScreen() {
  const router = useRouter();
  const colors = useColors();
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);

  const [saved] = useState<number | null>(getMonthlyBudget);
  const currency = useCurrency();
  const [amount, setAmount] = useState(saved === null ? "" : toKeypadText(saved));
  const [spent, setSpent] = useState(0);
  const [suggestions, setSuggestions] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const month = monthKey();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getMonthSummary(month), getMonthlyTotals(4)])
        .then(([summary, totals]) => {
          if (!active) return;
          setSpent(summary.depenses);
          // Moyenne des 3 derniers mois terminés.
          const past = totals.filter((row) => row.month < month).slice(0, 3);
          setSuggestions(budgetSuggestions(past.map((row) => row.depenses), currency.decimales));
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [month, currency.decimales]),
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const value = parseAmount(amount);

  const save = () => {
    if (value === null) {
      setError("Tape le montant maximum que tu veux dépenser chaque mois.");
      return;
    }
    try {
      setMonthlyBudget(value);
      close();
    } catch {
      setError("Enregistrement impossible. Réessaie.");
    }
  };

  const remove = () => {
    try {
      setMonthlyBudget(null);
      close();
    } catch {
      setError("Suppression impossible. Réessaie.");
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={close} style={styles.iconButton} hitSlop={6} accessibilityRole="button" accessibilityLabel="Fermer">
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Budget du mois
        </Text>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Combien veux-tu dépenser au maximum chaque mois ? Tu seras prévenu à 80 % puis à 100 %.
        </Text>

        <View style={styles.amountBox} accessible accessibilityLabel={`Budget : ${formatDigits(amount)} ${currency.nom} par mois`}>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {formatDigits(amount)}
            <Text style={styles.unit}> {currency.symbole} / mois</Text>
          </Text>
          <Text style={styles.spent}>
            Déjà dépensé en {formatMonthLabel(month).split(" ")[0].toLowerCase()} : {formatShort(spent)}
            {value !== null ? ` · ${budgetPercent(spent, value)} %` : ""}
          </Text>
        </View>

        {error !== null && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        {suggestions.length > 0 && <Text style={styles.suggestionsLabel}>D’après tes derniers mois</Text>}
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => {
                setAmount(toKeypadText(suggestion));
                setError(null);
              }}
              style={styles.suggestion}
              accessibilityRole="button"
            >
              <Text style={styles.suggestionText}>{formatShort(suggestion)}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => router.push("/categories")}
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>
            Budgets par catégorie <Text style={styles.linkHint}>· facultatif</Text>
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {saved !== null && (
          <Pressable onPress={remove} style={styles.removeButton} accessibilityRole="button">
            <Text style={styles.removeText}>Supprimer le budget</Text>
          </Pressable>
        )}
      </ScrollView>

      <Keypad
        onKey={(key) => {
          setAmount((current) => pressKey(current, key));
          setError(null);
        }}
        onClear={() => setAmount("")}
        compact={compact}
      />

      <View style={styles.footer}>
        <Pressable onPress={save} style={styles.submit} accessibilityRole="button">
          <Text style={styles.submitText}>Enregistrer · {formatDigits(amount)} {currency.symbole} / mois</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette, compact: boolean) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingTop: 6 },
    iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    title: { color: c.text, fontSize: 20, fontWeight: "800" },
    content: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
    intro: { color: c.textMuted, fontSize: 14, lineHeight: 20 },
    amountBox: { alignItems: "center", gap: 4, paddingVertical: compact ? 2 : 8 },
    amount: { color: c.text, fontSize: compact ? 36 : 44, fontWeight: "800", fontVariant: ["tabular-nums"] },
    unit: { color: c.textMuted, fontSize: compact ? 18 : 22, fontWeight: "700" },
    spent: { color: c.textMuted, fontSize: 13, textAlign: "center" },
    error: { color: c.danger, fontSize: 14, textAlign: "center" },
    suggestionsLabel: { color: c.textMuted, fontSize: 12, textAlign: "center" },
    suggestions: { flexDirection: "row", gap: 8, justifyContent: "center" },
    suggestion: {
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      justifyContent: "center",
    },
    suggestionText: { color: c.text, fontSize: 13, fontWeight: "600" },
    linkRow: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    pressed: { opacity: 0.7 },
    linkText: { color: c.text, fontSize: 14, fontWeight: "600" },
    linkHint: { color: c.textMuted, fontWeight: "400" },
    removeButton: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
    removeText: { color: c.danger, fontSize: 14, fontWeight: "600" },
    footer: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },
    submit: { minHeight: 54, borderRadius: 14, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    submitText: { color: c.onPrimary, fontSize: 16, fontWeight: "700" },
  });
