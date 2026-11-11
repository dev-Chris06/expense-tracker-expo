import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import TransactionForm from "@/components/TransactionForm";
import { type Palette, useColors } from "@/constants/theme";
import { getTransactionById, updateTransaction } from "@/db/transactions";
import type { Transaction } from "@/types/transaction";
import { UserFacingError } from "@/utils/errors";

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const numericId = Number(id);
  const invalidId = !Number.isInteger(numericId) || numericId <= 0;

  useEffect(() => {
    if (invalidId) return;
    let active = true;
    getTransactionById(numericId)
      .then((value) => {
        if (!active) return;
        setTransaction(value);
        if (!value) setError("Cette opération est introuvable.");
      })
      .catch(() => {
        if (active) setError("Impossible de charger cette opération.");
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

  if (invalidId || !transaction) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{invalidId ? "Cette opération est introuvable." : error}</Text>
        <Pressable onPress={() => router.replace("/list")} accessibilityRole="button">
          <Text style={styles.link}>Retour à la liste</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <TransactionForm
      initialTransaction={transaction}
      submitLabel="Enregistrer les modifications"
      onSubmit={async (value) => {
        const updated = await updateTransaction(transaction.id, value);
        if (!updated) {
          throw new UserFacingError("Cette opération n’existe plus : elle a peut-être été supprimée.");
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
