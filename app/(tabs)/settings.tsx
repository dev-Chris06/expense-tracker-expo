/**
 * Réglages : thème, accès au budget et aux catégories, version et mise à jour.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { UpdateFooter } from "@/components/Updates";
import { applyThemePreference, type Palette, useColors } from "@/constants/theme";
import { countActiveRecurrences } from "@/db/recurrences";
import {
  type AutoBackupState,
  getAutoBackupState,
  getMonthlyBudget,
  getReminderSettings,
  getThemePreference,
  type ReminderSettings,
  setThemePreference,
  type ThemePreference,
} from "@/db/settings";
import { useCurrency } from "@/utils/currency";
import { folderLabel } from "@/utils/autoBackup";
import { shareCsv } from "@/utils/dataFiles";
import { formatDateTime } from "@/utils/dateHelpers";
import { UserFacingError } from "@/utils/errors";
import { formatAmount } from "@/utils/formatters";
import { formatReminderTime } from "@/utils/reminderSchedule";
import { chooseAndRestore } from "@/utils/restoreFlow";

type FileAction = "restore" | "csv";

// Icône + texte : le symbole se reconnaît d'un coup d'œil, le texte lève
// toute ambiguïté (« Système » seul en icône ne se comprendrait pas).
const THEMES: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "Système", icon: "phone-portrait-outline" },
  { value: "light", label: "Clair", icon: "sunny-outline" },
  { value: "dark", label: "Sombre", icon: "moon-outline" },
];

interface LinkRowProps {
  title: string;
  hint: string;
  onPress: () => void;
  /** Toutes les lignes ont une icône : la liste se parcourt d'un coup d'œil. */
  icon: keyof typeof Ionicons.glyphMap;
  busy?: boolean;
}

/** Ligne de réglage qui ouvre un écran ou lance une action. */
function LinkRow({ title, hint, onPress, icon, busy }: LinkRowProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, styles.linkRow, pressed && styles.pressed]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy }}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);
  const [budget, setBudget] = useState<number | null>(getMonthlyBudget);
  const [recurringCount, setRecurringCount] = useState(0);
  const [reminder, setReminder] = useState<ReminderSettings>(getReminderSettings);
  const [autoBackup, setAutoBackup] = useState<AutoBackupState>(getAutoBackupState);
  const [busy, setBusy] = useState<FileAction | null>(null);
  const currency = useCurrency();

  // Budget, récurrences, rappel et sauvegardes se modifient sur leurs propres
  // écrans : relus au retour.
  const reload = useCallback(() => {
    setBudget(getMonthlyBudget());
    setReminder(getReminderSettings());
    setAutoBackup(getAutoBackupState());
    countActiveRecurrences()
      .then(setRecurringCount)
      .catch(() => undefined);
  }, []);
  useFocusEffect(reload);

  const runFileAction = (action: FileAction, task: () => Promise<void>) => {
    if (busy !== null) return;
    setBusy(action);
    task()
      .catch((e: unknown) =>
        Alert.alert(
          "Opération impossible",
          e instanceof UserFacingError ? e.message : "Le fichier n'a pas pu être créé ou lu. Réessaie.",
        ),
      )
      .finally(() => setBusy(null));
  };

  const restore = () =>
    chooseAndRestore(() => {
      setTheme(getThemePreference());
      reload();
    });

  const chooseTheme = (value: ThemePreference) => {
    setTheme(value);
    setThemePreference(value);
    applyThemePreference(value);
  };

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          Réglages
        </Text>

        <Text style={styles.section}>APPARENCE</Text>
        <View style={styles.card}>
          <View style={styles.cardTitle}>
            <Ionicons name="contrast-outline" size={22} color={colors.primary} />
            <Text style={styles.rowTitle}>Thème</Text>
          </View>
          <View style={styles.segments} accessibilityRole="radiogroup">
            {THEMES.map((t) => {
              const selected = theme === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => chooseTheme(t.value)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Ionicons name={t.icon} size={16} color={selected ? colors.text : colors.textMuted} />
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.section}>ARGENT</Text>
        <LinkRow
          icon="wallet-outline"
          title="Budget du mois"
          hint={budget === null ? "Aucun budget : touche pour en définir un." : `${formatAmount(budget)} par mois`}
          onPress={() => router.push("/budget")}
        />
        <LinkRow
          icon="cash-outline"
          title="Devise"
          hint={`${currency.nom} · ${currency.symbole}`}
          onPress={() => router.push("/currency")}
        />
        <LinkRow
          icon="repeat"
          title="Opérations récurrentes"
          hint={
            recurringCount > 0
              ? `${recurringCount} active${recurringCount > 1 ? "s" : ""}, ajoutée${recurringCount > 1 ? "s" : ""} seule${recurringCount > 1 ? "s" : ""} chaque mois.`
              : "Loyer, forfait, salaire… ajoutés tout seuls chaque mois."
          }
          onPress={() => router.push("/recurring")}
        />
        <LinkRow
          icon="pricetags-outline"
          title="Catégories"
          hint="Ajouter, renommer, masquer, icônes, couleurs et budgets par catégorie."
          onPress={() => router.push("/categories")}
        />

        <Text style={styles.section}>RAPPEL</Text>
        <LinkRow
          icon="notifications-outline"
          title="Rappel du soir"
          hint={
            reminder.enabled
              ? `Chaque soir à ${formatReminderTime(reminder)}, si rien n’a été noté dans la journée.`
              : "Désactivé. Un rappel le soir pour ne rien oublier."
          }
          onPress={() => router.push("/reminder")}
        />

        <Text style={styles.section}>MES DONNÉES</Text>
        <LinkRow
          icon="cloud-upload-outline"
          title="Sauvegardes"
          hint={
            autoBackup.error
              ? `Problème : ${autoBackup.error}`
              : autoBackup.folder
                ? `Automatique chaque semaine dans ${folderLabel(autoBackup.folder)}${
                    autoBackup.last ? `, dernière le ${formatDateTime(autoBackup.last)}` : ""
                  }.`
                : "Automatique dans un dossier, et envoi sur Drive ou WhatsApp pour changer de téléphone sans rien perdre."
          }
          onPress={() => router.push("/auto-backup")}
        />
        <LinkRow
          icon="cloud-download-outline"
          title="Restaurer une sauvegarde"
          hint="Remplace les données de ce téléphone par celles d’un fichier de sauvegarde."
          busy={busy === "restore"}
          onPress={() => runFileAction("restore", restore)}
        />
        <LinkRow
          icon="document-text-outline"
          title="Exporter vers Excel"
          hint="Toutes tes opérations dans un tableau, à ouvrir avec Excel, Google Sheets ou WPS."
          busy={busy === "csv"}
          onPress={() => runFileAction("csv", async () => void (await shareCsv()))}
        />

        <Text style={styles.section}>À PROPOS</Text>
        <View style={styles.card}>
          <UpdateFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingTop: 16, gap: 10, paddingBottom: 32 },
    flex: { flex: 1, gap: 4 },
    title: { color: c.text, fontSize: 24, fontWeight: "800", marginBottom: 4 },
    section: { marginTop: 10, marginLeft: 4, color: c.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 16,
      gap: 10,
    },
    pressed: { opacity: 0.7 },
    rowTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
    hint: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
    segments: { flexDirection: "row", backgroundColor: c.surfaceMuted, borderRadius: 10, padding: 3 },
    segment: {
      flex: 1,
      minHeight: 38,
      borderRadius: 8,
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: { flexDirection: "row", alignItems: "center", gap: 12 },
    segmentSelected: {
      backgroundColor: c.surface,
      elevation: 1,
      shadowColor: "#101828",
      shadowOpacity: 0.1,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    },
    segmentText: { color: c.textMuted, fontSize: 13, fontWeight: "600" },
    segmentTextSelected: { color: c.text, fontWeight: "700" },
    linkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  });
