import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { confirmDeleteTransaction } from "@/components/confirmDelete";
import QuickEntry from "@/components/QuickEntry";
import { type Palette, useColors } from "@/constants/theme";
import { deleteTransaction, getTransactionById, updateTransaction } from "@/db/transactions";
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
  // Retour à l'écran d'origine (accueil ou liste), qui se recharge seul.
  const close = () => (router.canGoBack() ? router.back() : router.replace("/list"));

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
        <Pressable onPress={() => router.replace("/list")} accessibilityRole="button" style={styles.linkButton}>
          <Text style={styles.link}>Retour à la liste</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <QuickEntry
      initialTransaction={transaction}
      onClose={close}
      onDelete={() =>
        confirmDeleteTransaction(transaction, () => {
          deleteTransaction(transaction.id)
            .then(close)
            .catch(() => Alert.alert("Suppression impossible", "Réessaie dans un instant."));
        })
      }
      onSubmit={async (value) => {
        const updated = await updateTransaction(transaction.id, value);
        if (!updated) {
          throw new UserFacingError("Cette opération n’existe plus : elle a peut-être été supprimée.");
        }
        close();
      }}
    />
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: c.background },
    text: { color: c.text },
    error: { color: c.danger },
    linkButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
    link: { color: c.link, fontWeight: "700" },
  });
