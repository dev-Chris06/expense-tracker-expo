/**
 * Saisie rapide d'une opération (ajout et modification).
 *
 * Pensée pour 3 gestes : taper le montant sur le pavé intégré, toucher une
 * catégorie, enregistrer. La date (aujourd'hui par défaut) et la note sont
 * accessibles mais discrètes. Les catégories les plus utilisées sur les
 * 90 derniers jours sont proposées en premier.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import CategoryIcon from "@/components/CategoryIcon";
import Keypad from "@/components/Keypad";
import { type Palette, useColors } from "@/constants/theme";
import { getCategories } from "@/db/categories";
import { getCategoryUsage } from "@/db/transactions";
import type { Category, Transaction, TransactionInput, TransactionType } from "@/types/transaction";
import { takeCreatedCategory } from "@/utils/createdCategory";
import { isValidISODate, todayISO, toISODate } from "@/utils/dateHelpers";
import { UserFacingError } from "@/utils/errors";
import { dayLabel } from "@/utils/grouping";
import { formatDigits, type KeypadKey, pressKey } from "@/utils/keypad";
import { validateTransactionInput } from "@/utils/validation";

/** Nombre de catégories visibles avant « Toutes ». */
const VISIBLE_CATEGORIES = 8;
const USAGE_DAYS = 90;

interface QuickEntryProps {
  initialTransaction?: Transaction;
  /** Type présélectionné pour un ajout (ignoré en modification). */
  initialType?: TransactionType;
  /** Peut lever une UserFacingError dont le message sera affiché. */
  onSubmit: (value: TransactionInput, category: Category) => Promise<void>;
  onClose: () => void;
  /** Affiche une corbeille dans l'en-tête (modification). */
  onDelete?: () => void;
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function daysAgoISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toISODate(date);
}

export default function QuickEntry({ initialTransaction, initialType = "depense", onSubmit, onClose, onDelete }: QuickEntryProps) {
  const router = useRouter();
  const colors = useColors();
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);

  const [type, setType] = useState<TransactionType>(initialTransaction?.type ?? initialType);
  const [amount, setAmount] = useState(initialTransaction ? String(initialTransaction.montant) : "");
  const [categoryId, setCategoryId] = useState<number | null>(initialTransaction?.categorieId ?? null);
  const [date, setDate] = useState(initialTransaction?.date ?? todayISO());
  const [note, setNote] = useState(initialTransaction?.note ?? "");
  const [noteOpen, setNoteOpen] = useState(!!initialTransaction?.note);
  const [noteFocused, setNoteFocused] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [usage, setUsage] = useState<Map<number, number>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Toutes les catégories, masquées comprises : une opération existante peut
  // appartenir à une catégorie masquée depuis. Rechargées à chaque retour sur
  // l'écran, pour inclure une catégorie créée avec « Nouvelle ».
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getCategories({ includeHidden: true }), getCategoryUsage(daysAgoISO(USAGE_DAYS))])
        .then(([rows, counts]) => {
          if (!active) return;
          setCategories(rows);
          setUsage(counts);
          const created = takeCreatedCategory();
          if (created && rows.some((c) => c.id === created.id)) {
            setType(created.type);
            setCategoryId(created.id);
            setError(null);
          }
        })
        .catch(() => {
          if (active) setError("Impossible de charger les catégories.");
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const choices = useMemo(() => {
    const ofType = categories.filter(
      (c) => c.type === type && (!c.masquee || c.id === initialTransaction?.categorieId),
    );
    // Les plus utilisées d'abord ; à égalité, l'ordre choisi dans les réglages.
    return ofType.sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.position - b.position);
  }, [categories, type, usage, initialTransaction?.categorieId]);

  const visible = useMemo(() => {
    if (showAll || choices.length <= VISIBLE_CATEGORIES) return choices;
    const first = choices.slice(0, VISIBLE_CATEGORIES);
    const selected = choices.find((c) => c.id === categoryId);
    // La catégorie choisie reste visible même si elle est peu utilisée.
    if (selected && !first.includes(selected)) first[VISIBLE_CATEGORIES - 1] = selected;
    return first;
  }, [choices, showAll, categoryId]);
  const hiddenCount = choices.length - visible.length;

  const changeType = (next: TransactionType) => {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
    setShowAll(false);
    setError(null);
  };

  const press = (key: KeypadKey) => {
    setAmount((current) => pressKey(current, key));
    setError(null);
  };

  const handleSubmit = async () => {
    const validation = validateTransactionInput(amount, categoryId, date);
    if (validation.error !== null) {
      setError(amount === "" ? "Tape un montant avec le pavé." : validation.error);
      return;
    }
    const category = categories.find((c) => c.id === validation.value.categorieId);
    if (!category) {
      setError("Choisis une catégorie.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ ...validation.value, note: note.trim() || null }, category);
    } catch (e) {
      setError(e instanceof UserFacingError ? e.message : "Enregistrement impossible. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setDatePickerVisible(false);
    if (event.type === "set" && selected) setDate(toISODate(selected));
  };

  const parsedDate = isValidISODate(date)
    ? (() => {
        const [y, m, d] = date.split("-").map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date();
  const dateChip = isValidISODate(date) ? dayLabel(date).split(" · ")[0] : "Date";
  const accent = type === "revenu" ? colors.success : colors.primary;
  const amountLabel = formatDigits(amount);

  const segment = (value: TransactionType, label: string) => {
    const selected = type === value;
    return (
      <Pressable
        onPress={() => changeType(value)}
        style={[styles.segment, selected && styles.segmentSelected]}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        <Text
          style={[
            styles.segmentText,
            selected && { color: value === "depense" ? colors.danger : colors.success },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.iconButton} hitSlop={6} accessibilityRole="button" accessibilityLabel="Fermer">
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.segments} accessibilityRole="radiogroup">
          {segment("depense", "Dépense")}
          {segment("revenu", "Revenu")}
        </View>
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            style={styles.iconButton}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Supprimer l’opération"
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.amountBox} accessible accessibilityLabel={`Montant : ${amount || "0"} francs CFA`}>
          <Text style={styles.amountCaption}>{initialTransaction ? "Modifier le montant" : "Montant"}</Text>
          <Text
            style={[styles.amount, type === "revenu" && { color: colors.success }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {/* Pas de signe tant qu'aucun montant n'est tapé (« 0 F », pas « −0 F »). */}
            {amount === "" ? "" : type === "revenu" ? "+" : "−"}
            {amountLabel}
            <Text style={styles.amountUnit}> F</Text>
          </Text>
        </View>

        {error !== null && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <Text style={styles.label}>
          Catégorie <Text style={styles.labelHint}>· les plus utilisées d’abord</Text>
        </Text>
        <View style={styles.grid} accessibilityRole="radiogroup">
          {chunk<Category | null>([...visible, null], 3).map((row, index) => (
            <View key={index} style={styles.gridRow}>
              {row.map((category) => {
                if (category === null) {
                  return (
                    <Pressable
                      key="new"
                      onPress={() =>
                        router.push({ pathname: "/category/[id]", params: { id: "new", type, from: "entry" } })
                      }
                      style={[styles.category, styles.newCategory, { borderColor: accent }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Nouvelle catégorie de ${type === "depense" ? "dépense" : "revenu"}`}
                    >
                      <View style={styles.newIcon}>
                        <Ionicons name="add" size={18} color={accent} />
                      </View>
                      <Text style={[styles.categoryText, { color: accent }]} numberOfLines={1}>
                        Nouvelle
                      </Text>
                    </Pressable>
                  );
                }
                const selected = category.id === categoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => {
                      setCategoryId(category.id);
                      setError(null);
                    }}
                    style={[styles.category, selected && { borderColor: accent, backgroundColor: `${accent}1A` }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={category.nom}
                  >
                    <CategoryIcon icon={category.icone} color={category.couleur} size={compact ? 26 : 30} />
                    <Text style={styles.categoryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {category.nom}
                    </Text>
                  </Pressable>
                );
              })}
              {Array.from({ length: 3 - row.length }, (_, i) => (
                <View key={`empty-${i}`} style={styles.categoryPlaceholder} />
              ))}
            </View>
          ))}
        </View>
        {(hiddenCount > 0 || showAll) && choices.length > VISIBLE_CATEGORIES && (
          <Pressable onPress={() => setShowAll((value) => !value)} style={styles.moreButton} accessibilityRole="button">
            <Text style={styles.moreText}>{showAll ? "Moins de catégories" : `Toutes les catégories (${choices.length})`}</Text>
          </Pressable>
        )}

        <View style={styles.chips}>
          {Platform.OS === "web" ? (
            <TextInput
              style={[styles.chip, styles.chipInput]}
              value={date}
              onChangeText={setDate}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Date, année-mois-jour"
            />
          ) : (
            <Pressable
              onPress={() => setDatePickerVisible((v) => !v)}
              style={styles.chip}
              accessibilityRole="button"
              accessibilityLabel={`Date : ${dateChip}. Changer`}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.text} />
              <Text style={styles.chipText}>{dateChip}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setNoteOpen((v) => !v)}
            style={[styles.chip, noteOpen && { borderColor: accent }]}
            accessibilityRole="button"
            accessibilityState={{ expanded: noteOpen }}
          >
            <Ionicons name="create-outline" size={16} color={colors.text} />
            <Text style={styles.chipText}>{note.trim() ? "Note ✓" : "Note"}</Text>
          </Pressable>
        </View>
        {datePickerVisible && Platform.OS !== "web" && (
          <DateTimePicker
            value={parsedDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={handleDateChange}
            maximumDate={new Date(2100, 11, 31)}
          />
        )}
        {noteOpen && (
          <TextInput
            style={styles.note}
            value={note}
            onChangeText={setNote}
            onFocus={() => setNoteFocused(true)}
            onBlur={() => setNoteFocused(false)}
            placeholder={type === "depense" ? "Ex. repas midi, zem…" : "Ex. salaire de novembre"}
            placeholderTextColor={colors.textMuted}
            maxLength={280}
            returnKeyType="done"
            accessibilityLabel="Note facultative"
          />
        )}
      </ScrollView>

      {/* Le pavé laisse la place au clavier du téléphone pendant la saisie de la note. */}
      {!noteFocused && <Keypad onKey={press} onClear={() => setAmount("")} compact={compact} />}

      <View style={styles.footer}>
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          style={[styles.submit, { backgroundColor: accent }, saving && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          <Text style={styles.submitText}>{saving ? "Enregistrement…" : `Enregistrer · ${amountLabel} F`}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette, compact: boolean) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 6 },
    iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    segments: { flex: 1, flexDirection: "row", backgroundColor: c.surfaceMuted, borderRadius: 12, padding: 4 },
    segment: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    segmentSelected: {
      backgroundColor: c.surface,
      elevation: 1,
      shadowColor: "#101828",
      shadowOpacity: 0.12,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    },
    segmentText: { color: c.textMuted, fontSize: 14, fontWeight: "700" },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
    amountBox: { alignItems: "center", paddingTop: compact ? 8 : 18, paddingBottom: compact ? 2 : 8 },
    amountCaption: { color: c.textMuted, fontSize: 13, fontWeight: "500" },
    amount: { color: c.text, fontSize: compact ? 38 : 46, fontWeight: "800", fontVariant: ["tabular-nums"] },
    amountUnit: { color: c.textMuted, fontSize: compact ? 20 : 24, fontWeight: "700" },
    error: { color: c.danger, fontSize: 14, textAlign: "center" },
    label: { color: c.text, fontSize: 13, fontWeight: "600" },
    labelHint: { color: c.textMuted, fontWeight: "400" },
    grid: { gap: 8 },
    gridRow: { flexDirection: "row", gap: 8 },
    // Icône au-dessus du nom : toute la largeur de la case reste pour le texte.
    category: {
      flex: 1,
      minHeight: compact ? 58 : 64,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingHorizontal: 4,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    categoryPlaceholder: { flex: 1 },
    newCategory: { borderStyle: "dashed", backgroundColor: c.surfaceMuted },
    newIcon: {
      width: compact ? 26 : 30,
      height: compact ? 26 : 30,
      borderRadius: 8,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryText: { color: c.text, fontSize: 13, fontWeight: "600", textAlign: "center" },
    moreButton: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 12 },
    moreText: { color: c.link, fontSize: 14, fontWeight: "600" },
    chips: { flexDirection: "row", gap: 8 },
    chip: {
      flex: 1,
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 12,
    },
    chipInput: { color: c.text, fontSize: 14 },
    chipText: { color: c.text, fontSize: 13, fontWeight: "600" },
    note: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      backgroundColor: c.surface,
      color: c.text,
    },
    footer: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },
    submit: { minHeight: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    disabled: { opacity: 0.6 },
    submitText: { color: c.onPrimary, fontSize: 16, fontWeight: "700" },
  });
