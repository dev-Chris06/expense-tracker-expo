/**
 * Fiche d'une catégorie : création (id = "new") ou modification.
 * Nom, icône, couleur, budget mensuel (dépenses) et masquage.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import CategoryIcon from "@/components/CategoryIcon";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/constants/categories";
import { type Palette, useColors } from "@/constants/theme";
import { addCategory, getCategoryById, updateCategory } from "@/db/categories";
import type { TransactionType } from "@/types/transaction";
import { rememberCreatedCategory } from "@/utils/createdCategory";
import { useCurrency } from "@/utils/currency";
import { UserFacingError } from "@/utils/errors";
import { toKeypadText } from "@/utils/keypad";
import { MAX_CATEGORY_NAME, validateCategoryInput } from "@/utils/validation";

export default function CategoryScreen() {
  const { id, type: typeParam, from } = useLocalSearchParams<{ id: string; type?: string; from?: string }>();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currency = useCurrency();

  const isNew = id === "new";
  const fromEntry = isNew && from === "entry";
  const numericId = Number(id);

  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [type, setType] = useState<TransactionType>(typeParam === "revenu" ? "revenu" : "depense");
  const [nom, setNom] = useState("");
  const [icone, setIcone] = useState<string>(CATEGORY_ICONS[0]);
  const [couleur, setCouleur] = useState<string>(CATEGORY_COLORS[0]);
  const [budgetText, setBudgetText] = useState("");
  const [masquee, setMasquee] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let active = true;
    getCategoryById(numericId)
      .then((category) => {
        if (!active) return;
        if (!category) {
          setNotFound(true);
          return;
        }
        setType(category.type);
        setNom(category.nom);
        setIcone(category.icone);
        setCouleur(category.couleur);
        setBudgetText(category.budget === null ? "" : toKeypadText(category.budget));
        setMasquee(category.masquee);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isNew, numericId]);

  const save = async () => {
    const validation = validateCategoryInput({ nom, type, couleur, icone, masquee, budgetText });
    if (validation.error !== null) {
      setError(validation.error);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isNew) {
        const newId = await addCategory(validation.value);
        // Ouverte depuis la saisie : la nouvelle catégorie y sera choisie au retour.
        if (fromEntry) rememberCreatedCategory({ id: newId, type: validation.value.type });
      } else if (!(await updateCategory(numericId, validation.value))) {
        throw new UserFacingError("Cette catégorie n’existe plus.");
      }
      router.back();
    } catch (e) {
      setError(e instanceof UserFacingError ? e.message : "Enregistrement impossible. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const title = isNew ? (type === "depense" ? "Nouvelle catégorie de dépense" : "Nouvelle catégorie de revenu") : "Catégorie";

  if (loading || notFound) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title }} />
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.error}>Cette catégorie est introuvable.</Text>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.preview}>
          <CategoryIcon icon={icone} color={couleur} size={52} />
          <Text style={styles.previewName}>{nom.trim() || "Nom de la catégorie"}</Text>
        </View>

        <Text style={styles.label}>Nom</Text>
        <TextInput
          style={styles.input}
          value={nom}
          onChangeText={setNom}
          placeholder={type === "depense" ? "Ex. Électricité" : "Ex. Prime"}
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_CATEGORY_NAME}
          accessibilityLabel="Nom de la catégorie"
        />

        <Text style={styles.label}>Icône</Text>
        <View style={styles.grid} accessibilityRole="radiogroup">
          {CATEGORY_ICONS.map((name, index) => (
            <Pressable
              key={name}
              onPress={() => setIcone(name)}
              style={[styles.iconChoice, icone === name && { borderColor: couleur, borderWidth: 2 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: icone === name }}
              accessibilityLabel={`Icône ${index + 1}`}
            >
              <Ionicons name={name} size={22} color={icone === name ? couleur : colors.text} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Couleur</Text>
        <View style={styles.grid} accessibilityRole="radiogroup">
          {CATEGORY_COLORS.map((color) => (
            <Pressable
              key={color}
              onPress={() => setCouleur(color)}
              style={[
                styles.colorChoice,
                { backgroundColor: color },
                couleur === color && { borderColor: colors.text, borderWidth: 3 },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: couleur === color }}
              accessibilityLabel={`Couleur ${color}`}
            />
          ))}
        </View>

        {type === "depense" && (
          <>
            <Text style={styles.label}>Budget mensuel · facultatif</Text>
            <TextInput
              style={styles.input}
              value={budgetText}
              onChangeText={setBudgetText}
              placeholder={`Montant en ${currency.symbole} (vide = aucun budget)`}
              placeholderTextColor={colors.textMuted}
              keyboardType={currency.decimales > 0 ? "decimal-pad" : "number-pad"}
              accessibilityLabel={`Budget mensuel de la catégorie en ${currency.nom}`}
            />
          </>
        )}

        {!isNew && (
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Masquer</Text>
              <Text style={styles.hint}>N’est plus proposée à la saisie ; les opérations existantes restent.</Text>
            </View>
            <Switch value={masquee} onValueChange={setMasquee} accessibilityLabel="Masquer la catégorie" />
          </View>
        )}

        {error !== null && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <Pressable
          style={[styles.submit, saving && styles.disabled]}
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          <Text style={styles.submitText}>
            {saving ? "Enregistrement…" : fromEntry ? "Créer et utiliser" : isNew ? "Créer la catégorie" : "Enregistrer"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background },
    content: { padding: 20, gap: 10, paddingBottom: 40 },
    preview: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 6 },
    previewName: { flex: 1, color: c.text, fontSize: 20, fontWeight: "700" },
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
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    iconChoice: {
      width: 46,
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    colorChoice: { width: 40, height: 40, borderRadius: 20, borderWidth: 0, borderColor: "transparent" },
    switchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
    switchText: { flex: 1, gap: 2 },
    switchTitle: { color: c.text, fontSize: 16, fontWeight: "600" },
    hint: { color: c.textMuted, fontSize: 13 },
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
