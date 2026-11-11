import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import Chip from "@/components/Chip";
import { type Palette, useColors } from "@/constants/theme";
import { getCategories } from "@/db/categories";
import { deleteTransaction, getAllTransactions } from "@/db/transactions";
import type { Category, Transaction, TransactionType } from "@/types/transaction";
import { formatDisplayDate } from "@/utils/dateHelpers";
import { formatAmount, formatSignedAmount } from "@/utils/formatters";
import { matchesQuery } from "@/utils/search";

export default function ListScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [rows, setRows] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TransactionType | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    Promise.all([getAllTransactions(), getCategories()])
      .then(([transactions, visibleCategories]) => {
        setRows(transactions);
        setCategories(visibleCategories);
        setError("");
      })
      .catch(() => setError("Chargement impossible. Réessaie."));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const remove = (transaction: Transaction) => {
    const kind = transaction.type === "depense" ? "dépense" : "revenu";
    const action = async () => {
      try {
        await deleteTransaction(transaction.id);
        refresh();
      } catch {
        setError("Suppression impossible.");
      }
    };

    const message = `${transaction.categorie} · ${formatAmount(transaction.montant)} du ${formatDisplayDate(transaction.date)}`;
    if (Platform.OS === "web") {
      if (globalThis.confirm(`Supprimer ce ${kind} ?\n${message}`)) void action();
    } else {
      Alert.alert(`Supprimer ${kind === "dépense" ? "la dépense" : "le revenu"} ?`, `${message}\nCette action est définitive.`, [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => void action() },
      ]);
    }
  };

  const filtered = rows.filter(
    (t) =>
      (!type || t.type === type) &&
      (categoryId === null || t.categorieId === categoryId) &&
      matchesQuery(t, query),
  );

  const selectType = (next: TransactionType | null) => {
    setType(next);
    setCategoryId(null);
  };

  return (
    <View style={styles.page}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher (catégorie, note, date, montant)"
        placeholderTextColor={colors.textMuted}
        style={styles.search}
        accessibilityLabel="Rechercher une opération"
        clearButtonMode="while-editing"
      />
      <View style={styles.chips}>
        <Chip label="Tout" selected={!type} onPress={() => selectType(null)} />
        <Chip label="Dépenses" selected={type === "depense"} onPress={() => selectType("depense")} />
        <Chip label="Revenus" selected={type === "revenu"} onPress={() => selectType("revenu")} />
      </View>
      {type && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
          {categories
            .filter((c) => c.type === type)
            .map((c) => (
              <Chip
                key={c.id}
                label={`${c.icone} ${c.nom}`}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
              />
            ))}
        </ScrollView>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={filtered}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={!filtered.length ? styles.emptyList : undefined}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {rows.length ? "Aucune opération ne correspond à la recherche." : "Aucune opération pour le moment."}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={styles.main}
              onPress={() => router.push(`/edit/${item.id}`)}
              accessibilityRole="button"
              accessibilityHint="Ouvre l’opération pour la modifier"
            >
              <Text style={styles.category}>
                {item.icone} {item.categorie}
              </Text>
              <Text style={styles.muted} numberOfLines={2}>
                {formatDisplayDate(item.date)}
                {item.note ? ` · ${item.note}` : ""}
              </Text>
            </Pressable>
            <View style={styles.actions}>
              <Text style={[styles.amount, item.type === "revenu" && { color: colors.success }]}>
                {formatSignedAmount(item.montant, item.type)}
              </Text>
              <Pressable
                onPress={() => remove(item)}
                style={styles.deleteButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Supprimer ${item.categorie}, ${formatAmount(item.montant)}`}
              >
                <Text style={styles.delete}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, padding: 16, gap: 12, backgroundColor: c.background },
    search: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: 12,
      padding: 13,
      fontSize: 16,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    categoryChips: { gap: 8, paddingRight: 8 },
    error: { color: c.danger },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.surface,
      padding: 16,
      borderRadius: 14,
      marginBottom: 10,
      gap: 10,
    },
    main: { flex: 1 },
    actions: { alignItems: "flex-end", gap: 6 },
    category: { fontSize: 15, fontWeight: "700", color: c.text, marginBottom: 5 },
    amount: { fontSize: 15, fontWeight: "700", color: c.text },
    muted: { fontSize: 13, color: c.textMuted },
    deleteButton: { paddingVertical: 6, paddingHorizontal: 4 },
    delete: { fontSize: 14, color: c.danger, fontWeight: "600" },
    emptyList: { flexGrow: 1, justifyContent: "center" },
    empty: { fontSize: 14, color: c.textMuted, textAlign: "center" },
  });
