/**
 * Formulaire d'opération (ajout et modification) : dépense ou revenu,
 * montant, catégorie, date et note.
 */
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import CategoryPicker from "@/components/CategoryPicker";
import Chip from "@/components/Chip";
import { type Palette, useColors } from "@/constants/theme";
import { getCategories } from "@/db/categories";
import type { Category, Transaction, TransactionInput, TransactionType } from "@/types/transaction";
import { formatDisplayDate, isValidISODate, todayISO, toISODate } from "@/utils/dateHelpers";
import { UserFacingError } from "@/utils/errors";
import { validateTransactionInput } from "@/utils/validation";

interface TransactionFormProps {
  initialTransaction?: Transaction;
  /** Type présélectionné pour un ajout (ignoré en modification). */
  initialType?: TransactionType;
  /** Texte du bouton ; par défaut « Enregistrer la dépense / le revenu ». */
  submitLabel?: string;
  /** Peut lever une UserFacingError dont le message sera affiché. */
  onSubmit: (value: TransactionInput, category: Category) => Promise<void>;
}

export default function TransactionForm({
  initialTransaction,
  initialType = "depense",
  submitLabel,
  onSubmit,
}: TransactionFormProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [type, setType] = useState<TransactionType>(initialTransaction?.type ?? initialType);
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState(initialTransaction ? String(initialTransaction.montant) : "");
  const [categoryId, setCategoryId] = useState<number | null>(initialTransaction?.categorieId ?? null);
  const [date, setDate] = useState(initialTransaction?.date ?? todayISO());
  const [note, setNote] = useState(initialTransaction?.note ?? "");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Toutes les catégories, masquées comprises : une opération existante peut
  // appartenir à une catégorie masquée depuis.
  useEffect(() => {
    let active = true;
    getCategories({ includeHidden: true })
      .then((rows) => {
        if (active) setCategories(rows);
      })
      .catch(() => {
        if (active) setError("Impossible de charger les catégories.");
      });
    return () => {
      active = false;
    };
  }, []);

  const choices = categories.filter(
    (c) => c.type === type && (!c.masquee || c.id === initialTransaction?.categorieId),
  );

  const changeType = (next: TransactionType) => {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
  };

  const handleSubmit = async () => {
    const validation = validateTransactionInput(amount, categoryId, date);
    if (validation.error !== null) {
      setError(validation.error);
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

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setDatePickerVisible(false);
    if (event.type === "set" && selectedDate) setDate(toISODate(selectedDate));
  };

  const parsedDate = isValidISODate(date)
    ? (() => {
        const [year, month, day] = date.split("-").map(Number);
        return new Date(year, month - 1, day);
      })()
    : new Date();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.types} accessibilityRole="radiogroup">
          <Chip label="Dépense" selected={type === "depense"} onPress={() => changeType("depense")} />
          <Chip label="Revenu" selected={type === "revenu"} onPress={() => changeType("revenu")} />
        </View>

        <Text style={styles.label}>Montant · FCFA</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Ex. 1 500"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          accessibilityLabel="Montant en francs CFA"
        />

        <Text style={styles.label}>Catégorie</Text>
        <CategoryPicker categories={choices} value={categoryId} onChange={setCategoryId} />

        <Text style={styles.label}>Date</Text>
        {Platform.OS === "web" ? (
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Date, année-mois-jour"
          />
        ) : (
          <View>
            <Pressable
              style={styles.dateButton}
              onPress={() => setDatePickerVisible((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={`Date : ${formatDisplayDate(date)}. Changer`}
            >
              <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
              <Text style={styles.dateAction}>Changer</Text>
            </Pressable>
            {datePickerVisible && (
              <DateTimePicker
                value={parsedDate}
                mode="date"
                display={Platform.OS === "ios" ? "compact" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date(2100, 11, 31)}
              />
            )}
          </View>
        )}

        <Text style={styles.label}>Note · facultative</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          placeholder={type === "depense" ? "Ex. déjeuner" : "Ex. salaire d’octobre"}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={280}
          accessibilityLabel="Note facultative"
        />

        {error !== null && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <Pressable
          style={[styles.submit, saving && styles.disabled]}
          onPress={handleSubmit}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          <Text style={styles.submitText}>{saving
              ? "Enregistrement…"
              : (submitLabel ?? (type === "depense" ? "Enregistrer la dépense" : "Enregistrer le revenu"))}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, gap: 10 },
    types: { flexDirection: "row", gap: 8 },
    label: { color: c.textMuted, fontSize: 14, fontWeight: "600", marginTop: 8 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      backgroundColor: c.surface,
      color: c.text,
    },
    dateButton: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.surface,
    },
    dateText: { color: c.text, fontSize: 16 },
    dateAction: { color: c.link, fontWeight: "600" },
    noteInput: { minHeight: 84, textAlignVertical: "top" },
    error: { color: c.danger, fontSize: 14, marginTop: 4 },
    submit: {
      marginTop: 14,
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    disabled: { opacity: 0.6 },
    submitText: { color: c.onPrimary, fontSize: 16, fontWeight: "700" },
  });
