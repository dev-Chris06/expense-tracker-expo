import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import ExpenseForm from "@/components/ExpenseForm";
import { type Palette, useColors } from "@/constants/theme";
import { getExpenseById, updateExpense } from "@/db/expenses";
import type { Expense } from "@/types/expense";
import { UserFacingError } from "@/utils/errors";

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const numericId = Number(id);
  const invalidId = !Number.isInteger(numericId) || numericId <= 0;

  useEffect(() => {
    if (invalidId) return;
    let active = true;
    getExpenseById(numericId)
      .then((value) => {
        if (!active) return;
        setExpense(value);
        if (!value) setError("Cette dépense est introuvable.");
      })
      .catch(() => {
        if (active) setError("Impossible de charger cette dépense.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [invalidId, numericId]);

  if (!invalidId && loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.text}>Chargement…</Text>
      </View>
    );
  }

  if (invalidId || !expense) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{invalidId ? "Cette dépense est introuvable." : error}</Text>
        <Pressable onPress={() => router.replace("/list")} accessibilityRole="button">
          <Text style={styles.link}>Retour à la liste</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ExpenseForm
      initialExpense={expense}
      submitLabel="Enregistrer les modifications"
      onSubmit={async (value) => {
        const updated = await updateExpense(expense.id, value);
        if (!updated) {
          throw new UserFacingError("Cette dépense n’existe plus : elle a peut-être été supprimée.");
        }
        // Retour à l'écran d'origine (accueil ou liste), qui se recharge seul.
        if (router.canGoBack()) router.back();
        else router.replace("/list");
      }}
    />
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: c.background },
    text: { color: c.text },
    error: { color: c.danger },
    link: { color: c.link, fontWeight: "700" },
  });
