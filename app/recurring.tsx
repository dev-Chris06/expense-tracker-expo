/**
 * Opérations récurrentes : liste, pause / reprise, suppression.
 *
 * On en crée une depuis la saisie rapide (« Chaque mois »). Pour changer
 * un montant (loyer augmenté…), on supprime et on recrée : c'est rare, et
 * cela évite un deuxième formulaire.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import CategoryIcon from "@/components/CategoryIcon";
import { type Palette, useColors } from "@/constants/theme";
import { deleteRecurrence, getRecurrences, type Recurrence, setRecurrenceActive } from "@/db/recurrences";
import { useCurrency } from "@/utils/currency";
import { formatShort } from "@/utils/formatters";
import { recurrenceLabel } from "@/utils/recurrence";

export default function RecurringScreen() {
  const router = useRouter();
  const colors = useColors();
  useCurrency();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<Recurrence[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    getRecurrences()
      .then((rows) => {
        setItems(rows);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useFocusEffect(load);

  const run = (task: Promise<void>) =>
    task.then(load).catch(() => Alert.alert("Action impossible", "Rien n'a été modifié. Réessaie."));

  const open = (r: Recurrence) => {
    const title = r.note?.trim() || r.categorie;
    Alert.alert(
      title,
      `${r.type === "revenu" ? "+" : "−"}${formatShort(r.montant)} · ${recurrenceLabel(r.jour).toLowerCase()}.\n` +
        "Les opérations déjà ajoutées restent dans ta liste.",
      [
        {
          text: r.active ? "Mettre en pause" : "Reprendre",
          onPress: () => run(setRecurrenceActive(r, !r.active)),
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () =>
            Alert.alert("Supprimer cette récurrence ?", "Elle ne sera plus ajoutée. Les opérations passées sont gardées.", [
              { text: "Annuler", style: "cancel" },
              { text: "Supprimer", style: "destructive", onPress: () => run(deleteRecurrence(r.id)) },
            ]),
        },
        { text: "Fermer", style: "cancel" },
      ],
    );
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Loyer, forfait, salaire… ajoutés tout seuls à leur date, chaque mois. Pour en créer une, touche{" "}
        <Text style={styles.strong}>Chaque mois</Text> en saisissant une opération.
      </Text>

      {error && <Text style={styles.error}>Impossible de charger les opérations récurrentes.</Text>}

      {items !== null && items.length === 0 && (
        <View style={[styles.card, styles.empty]}>
          <Ionicons name="repeat" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>Aucune opération récurrente pour l’instant.</Text>
          <Pressable onPress={() => router.push("/add")} style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonText}>Saisir une opération</Text>
          </Pressable>
        </View>
      )}

      {items !== null && items.length > 0 && (
        <View style={styles.card}>
          {items.map((r, index) => (
            <Pressable
              key={r.id}
              onPress={() => open(r)}
              style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityHint="Mettre en pause, reprendre ou supprimer"
            >
              <View style={!r.active && styles.paused}>
                <CategoryIcon icon={r.icone} color={r.couleur} />
              </View>
              <View style={[styles.flex, !r.active && styles.paused]}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.note?.trim() || r.categorie}
                </Text>
                <Text style={styles.detail} numberOfLines={1}>
                  {r.active ? recurrenceLabel(r.jour) : "En pause"}
                  {r.note?.trim() ? ` · ${r.categorie}` : ""}
                </Text>
              </View>
              <Text style={[styles.amount, r.type === "revenu" && { color: colors.success }, !r.active && styles.paused]}>
                {r.type === "revenu" ? "+" : "−"}
                {formatShort(r.montant)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 12, paddingBottom: 32 },
    intro: { color: c.textMuted, fontSize: 14, lineHeight: 20, marginHorizontal: 4 },
    strong: { color: c.text, fontWeight: "700" },
    error: { color: c.danger, fontSize: 14, textAlign: "center" },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: "hidden",
    },
    empty: { alignItems: "center", gap: 12, padding: 24 },
    emptyText: { color: c.textMuted, fontSize: 14, textAlign: "center" },
    button: { backgroundColor: c.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
    buttonText: { color: c.onPrimary, fontSize: 15, fontWeight: "700" },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider },
    pressed: { opacity: 0.7 },
    paused: { opacity: 0.45 },
    flex: { flex: 1, gap: 2 },
    name: { color: c.text, fontSize: 15, fontWeight: "600" },
    detail: { color: c.textMuted, fontSize: 13 },
    amount: { color: c.text, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  });
