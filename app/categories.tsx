/**
 * Liste des catégories d'un type (dépenses ou revenus), masquées comprises.
 * Toucher une catégorie ouvre sa fiche ; « Nouvelle catégorie » en crée une.
 */
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import Chip from "@/components/Chip";
import { type Palette, useColors } from "@/constants/theme";
import { getCategories } from "@/db/categories";
import type { Category, TransactionType } from "@/types/transaction";
import { formatAmount } from "@/utils/formatters";

export default function CategoriesScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [type, setType] = useState<TransactionType>("depense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCategories({ includeHidden: true })
        .then((rows) => {
          if (!active) return;
          setCategories(rows);
          setError(false);
        })
        .catch(() => {
          if (active) setError(true);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const visible = categories.filter((c) => c.type === type);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.chips} accessibilityRole="radiogroup">
        <Chip label="Dépenses" selected={type === "depense"} onPress={() => setType("depense")} />
        <Chip label="Revenus" selected={type === "revenu"} onPress={() => setType("revenu")} />
      </View>
      <Text style={styles.hint}>
        {type === "depense"
          ? "Touche une catégorie pour la modifier ou lui donner un budget mensuel."
          : "Touche une catégorie pour la modifier."}{" "}
        Une catégorie masquée n’est plus proposée, mais ses opérations sont conservées.
      </Text>
      {error && <Text style={styles.error}>Impossible de charger les catégories.</Text>}

      <View style={styles.panel}>
        {visible.map((category) => (
          <Pressable
            key={category.id}
            style={styles.row}
            onPress={() => router.push(`/category/${category.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${category.nom}${category.masquee ? ", masquée" : ""}${
              category.budget !== null ? `, budget ${formatAmount(category.budget)}` : ""
            }`}
          >
            <View style={[styles.icon, { backgroundColor: category.couleur }]}>
              <Text style={styles.iconText}>{category.icone}</Text>
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.name, category.masquee && styles.hidden]}>{category.nom}</Text>
              {(category.masquee || category.budget !== null) && (
                <Text style={styles.detail}>
                  {[category.masquee ? "Masquée" : null, category.budget !== null ? `Budget ${formatAmount(category.budget)}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.button}
        onPress={() => router.push({ pathname: "/category/[id]", params: { id: "new", type } })}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>＋ Nouvelle catégorie</Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 18, gap: 12, paddingBottom: 40 },
    chips: { flexDirection: "row", gap: 8 },
    hint: { color: c.textMuted, fontSize: 13 },
    error: { color: c.danger },
    panel: { backgroundColor: c.surface, borderRadius: 14, paddingVertical: 4 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 56 },
    icon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    iconText: { fontSize: 19 },
    rowMain: { flex: 1, gap: 2 },
    name: { color: c.text, fontSize: 16, fontWeight: "600" },
    hidden: { color: c.textMuted, textDecorationLine: "line-through" },
    detail: { color: c.textMuted, fontSize: 13 },
    chevron: { color: c.textMuted, fontSize: 26 },
    button: { backgroundColor: c.primary, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" },
    buttonText: { color: c.onPrimary, fontWeight: "700", fontSize: 16 },
  });
