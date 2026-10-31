import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import Chip from "@/components/Chip";
import { CATEGORIES, type Category } from "@/constants/categories";
import { type Palette, useColors } from "@/constants/theme";
import { deleteExpense, getAllExpenses } from "@/db/expenses";
import type { Expense } from "@/types/expense";
import { formatDisplayDate } from "@/utils/dateHelpers";
import { formatAmount } from "@/utils/formatters";
import { matchesQuery } from "@/utils/search";

export default function ListScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [rows, setRows] = useState<Expense[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    getAllExpenses()
      .then((expenses) => {
        setRows(expenses);
        setError("");
      })
      .catch(() => setError("Chargement impossible. Réessaie."));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const remove = (expense: Expense) => {
    const action = async () => {
      try {
        await deleteExpense(expense.id);
        refresh();
      } catch {
        setError("Suppression impossible.");
      }
    };

    const message = `${expense.categorie} · ${formatAmount(expense.montant)} du ${formatDisplayDate(expense.date)}`;
    if (Platform.OS === "web") {
      if (globalThis.confirm(`Supprimer cette dépense ?\n${message}`)) void action();
    } else {
      Alert.alert("Supprimer la dépense ?", `${message}\nCette action est définitive.`, [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => void action() },
      ]);
    }
  };

  const filtered = rows.filter(
    (expense) => (!category || expense.categorie === category) && matchesQuery(expense, query),
  );

  return (
    <View style={styles.page}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher (catégorie, note, date, montant)"
        placeholderTextColor={colors.textMuted}
        style={styles.search}
        accessibilityLabel="Rechercher une dépense"
        clearButtonMode="while-editing"
      />
      <View style={styles.chips}>
        <Chip label="Tout" selected={!category} onPress={() => setCategory(null)} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={category === c}
            onPress={() => setCategory(category === c ? null : c)}
          />
        ))}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={filtered}
        keyExtractor={(expense) => String(expense.id)}
        contentContainerStyle={!filtered.length ? styles.emptyList : undefined}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {rows.length ? "Aucune dépense ne correspond à la recherche." : "Aucune dépense pour le moment."}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={styles.main}
              onPress={() => router.push(`/edit/${item.id}`)}
              accessibilityRole="button"
              accessibilityHint="Ouvre la dépense pour la modifier"
            >
              <Text style={styles.category}>{item.categorie}</Text>
              <Text style={styles.muted} numberOfLines={2}>
                {formatDisplayDate(item.date)}
                {item.note ? ` · ${item.note}` : ""}
              </Text>
            </Pressable>
            <View style={styles.actions}>
              <Text style={styles.amount}>{formatAmount(item.montant)}</Text>
              <Pressable
                onPress={() => remove(item)}
                style={styles.deleteButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Supprimer la dépense ${item.categorie} de ${formatAmount(item.montant)}`}
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
