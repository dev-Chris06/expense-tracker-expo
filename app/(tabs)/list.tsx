/**
 * Opérations d'un mois, groupées par jour avec le total de chaque jour.
 * Recherche (dans tous les mois), filtres dépenses / revenus / catégorie,
 * tri. Toucher une opération l'ouvre ; un appui long propose de la supprimer.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import Chip from "@/components/Chip";
import { confirmDeleteTransaction } from "@/components/confirmDelete";
import MonthNav from "@/components/MonthNav";
import SortSheet from "@/components/SortSheet";
import TransactionRow from "@/components/TransactionRow";
import { type Palette, useColors } from "@/constants/theme";
import { getCategories } from "@/db/categories";
import { deleteTransaction, getAllTransactions } from "@/db/transactions";
import type { Category, Transaction, TransactionType } from "@/types/transaction";
import { formatCount, formatNet } from "@/utils/formatters";
import { dayLabel, groupByDay, type SortOrder, sortTransactions } from "@/utils/grouping";
import { monthKey } from "@/utils/months";
import { matchesQuery } from "@/utils/search";
import { syncRemindersQuietly } from "@/utils/reminders";
import { useCurrency } from "@/utils/currency";

export default function ListScreen() {
  const router = useRouter();
  const colors = useColors();
  // Redessine les montants quand la devise change.
  useCurrency();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [rows, setRows] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [month, setMonth] = useState(monthKey());
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TransactionType | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOrder>("recent");
  const [sortOpen, setSortOpen] = useState(false);
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

  const searching = query.trim() !== "";
  const filtered = useMemo(
    () =>
      sortTransactions(
        rows.filter(
          (t) =>
            // Une recherche porte sur tous les mois ; sinon, le mois affiché.
            (searching || t.date.startsWith(month)) &&
            (!type || t.type === type) &&
            (categoryId === null || t.categorieId === categoryId) &&
            matchesQuery(t, query),
        ),
        sort,
      ),
    [rows, searching, month, type, categoryId, query, sort],
  );

  // Groupé par jour pour un tri par date ; une seule liste pour le tri par montant.
  const sections = useMemo(
    () =>
      sort === "amount"
        ? filtered.length
          ? [{ date: "", total: 0, data: filtered }]
          : []
        : groupByDay(filtered),
    [filtered, sort],
  );

  const net = filtered.reduce((sum, t) => sum + (t.type === "revenu" ? t.montant : -t.montant), 0);
  const detail = `${formatCount(filtered.length)} · ${formatNet(net)}`;

  const remove = (transaction: Transaction) =>
    confirmDeleteTransaction(transaction, () => {
      deleteTransaction(transaction.id)
        .then(() => {
          refresh();
          // Plus rien noté aujourd'hui ? Le rappel de ce soir doit revenir.
          syncRemindersQuietly();
        })
        .catch(() => setError("Suppression impossible."));
    });

  const selectType = (next: TransactionType | null) => {
    setType(next);
    setCategoryId(null);
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          Opérations
        </Text>
        {/* Mis en couleur quand un autre tri que le tri habituel est actif. */}
        <Pressable
          onPress={() => setSortOpen(true)}
          style={[styles.sortButton, sort !== "recent" && { borderColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Trier les opérations"
        >
          <Ionicons name="swap-vertical-outline" size={16} color={sort !== "recent" ? colors.primary : colors.text} />
          <Text style={[styles.sortText, sort !== "recent" && { color: colors.primary }]}>Trier</Text>
        </Pressable>
      </View>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher (repas, 1500, 12/11…)"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          accessibilityLabel="Rechercher une opération dans tous les mois"
          returnKeyType="search"
        />
        {searching && (
          <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Effacer la recherche">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

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
                label={c.nom}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
              />
            ))}
        </ScrollView>
      )}

      {searching ? (
        <Text style={styles.searchDetail}>Résultats dans tous les mois · {detail}</Text>
      ) : (
        <MonthNav month={month} onChange={setMonth} detail={detail} />
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <SectionList
        sections={sections}
        keyExtractor={(t) => String(t.id)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) =>
          section.date ? (
            <View style={styles.dayHeader} accessibilityRole="header">
              <Text style={styles.dayLabel}>{dayLabel(section.date).toUpperCase()}</Text>
              <Text style={[styles.dayLabel, section.total > 0 && { color: colors.success }]}>{formatNet(section.total)}</Text>
            </View>
          ) : null
        }
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.item,
              index === 0 && styles.itemFirst,
              index === section.data.length - 1 && styles.itemLast,
            ]}
          >
            <TransactionRow
              transaction={item}
              showDate={sort === "amount" || searching}
              divider={index < section.data.length - 1}
              onPress={() => router.push(`/edit/${item.id}`)}
              onLongPress={() => remove(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {rows.length === 0
              ? "Aucune opération pour le moment. Touche ＋ pour en ajouter une."
              : searching || type || categoryId !== null
                ? "Aucune opération ne correspond."
                : "Aucune opération ce mois-ci."}
          </Text>
        }
        ListFooterComponent={
          filtered.length > 0 ? <Text style={styles.hint}>Appui long sur une opération pour la supprimer.</Text> : undefined
        }
      />
      <SortSheet visible={sortOpen} value={sort} onChange={setSort} onClose={() => setSortOpen(false)} />
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingBottom: 32 },
    header: { gap: 12, paddingTop: 16, paddingBottom: 4 },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    title: { color: c.text, fontSize: 24, fontWeight: "800" },
    sortButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 40,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    sortText: { color: c.text, fontSize: 13, fontWeight: "600" },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 48,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    searchInput: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 10 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    categoryChips: { gap: 8, paddingRight: 8 },
    searchDetail: { color: c.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 8 },
    error: { color: c.danger },
    dayHeader: { flexDirection: "row", justifyContent: "space-between", paddingTop: 16, paddingBottom: 6, paddingHorizontal: 2 },
    dayLabel: { color: c.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
    item: {
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    itemFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 2 },
    itemLast: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      paddingBottom: 2,
    },
    empty: { color: c.textMuted, fontSize: 14, textAlign: "center", paddingVertical: 40 },
    hint: { color: c.textMuted, fontSize: 12, textAlign: "center", paddingTop: 16 },
  });
