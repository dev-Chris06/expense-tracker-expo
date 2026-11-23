/**
 * Rappel du soir : activer / désactiver et choisir l'heure.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { type Palette, useColors } from "@/constants/theme";
import { getReminderSettings, type ReminderSettings, setReminderEnabled, setReminderTime } from "@/db/settings";
import { formatReminderTime } from "@/utils/reminderSchedule";
import {
  askNotificationPermission,
  notificationsAllowed,
  REMINDER_BODY,
  REMINDER_TITLE,
  syncRemindersQuietly,
} from "@/utils/reminders";

const PRESET_HOURS = [19, 20, 21, 22];

export default function ReminderScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [settings, setSettings] = useState<ReminderSettings>(getReminderSettings);
  const [allowed, setAllowed] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Relu au retour des réglages du téléphone (notifications réautorisées).
  useFocusEffect(
    useCallback(() => {
      notificationsAllowed()
        .then(setAllowed)
        .catch(() => undefined);
    }, []),
  );

  const save = (next: ReminderSettings) => {
    try {
      setReminderEnabled(next.enabled);
      setReminderTime(next.hour, next.minute);
      setSettings(next);
      syncRemindersQuietly();
    } catch {
      Alert.alert("Enregistrement impossible", "Le réglage n'a pas été changé. Réessaie.");
    }
  };

  const toggle = async (enabled: boolean) => {
    if (enabled && !(await askNotificationPermission())) {
      setAllowed(false);
      Alert.alert(
        "Notifications bloquées",
        "Pour recevoir le rappel, autorise les notifications de Dépenses Perso dans les réglages du téléphone.",
        [
          { text: "Plus tard", style: "cancel" },
          { text: "Ouvrir les réglages", onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }
    setAllowed(true);
    save({ ...settings, enabled });
  };

  const handlePicked = (event: DateTimePickerEvent, date?: Date) => {
    setPickerOpen(false);
    if (event.type === "set" && date) save({ ...settings, hour: date.getHours(), minute: date.getMinutes() });
  };

  const presetSelected = settings.minute === 0 && PRESET_HOURS.includes(settings.hour);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.card, styles.switchRow]}>
        <View style={styles.flex}>
          <Text style={styles.title}>Rappel du soir</Text>
          <Text style={styles.hint}>
            {settings.enabled ? `Chaque soir à ${formatReminderTime(settings)}` : "Désactivé"}
          </Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={(value) => void toggle(value)}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Rappel du soir"
        />
      </View>

      {settings.enabled && !allowed && (
        <Pressable onPress={() => void Linking.openSettings()} style={[styles.card, styles.warning]} accessibilityRole="button">
          <Ionicons name="notifications-off-outline" size={22} color={colors.danger} />
          <Text style={[styles.flex, styles.warningText]}>
            Les notifications sont bloquées sur ce téléphone : le rappel ne s’affichera pas. Touche ici pour les autoriser.
          </Text>
        </Pressable>
      )}

      <Text style={styles.section}>HEURE</Text>
      <View style={styles.hours} accessibilityRole="radiogroup">
        {PRESET_HOURS.map((hour) => {
          const selected = settings.minute === 0 && settings.hour === hour;
          return (
            <Pressable
              key={hour}
              onPress={() => save({ ...settings, hour, minute: 0 })}
              style={[styles.hour, selected && styles.hourSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.hourText, selected && styles.hourTextSelected]}>{hour} h</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.hour, !presetSelected && styles.hourSelected]}
          accessibilityRole="radio"
          accessibilityState={{ selected: !presetSelected }}
        >
          <Text style={[styles.hourText, !presetSelected && styles.hourTextSelected]}>
            {presetSelected ? "Autre" : formatReminderTime(settings)}
          </Text>
        </Pressable>
      </View>
      {pickerOpen && (
        <DateTimePicker
          value={new Date(2026, 0, 1, settings.hour, settings.minute)}
          mode="time"
          is24Hour
          onChange={handlePicked}
        />
      )}

      <Text style={styles.section}>APERÇU</Text>
      <View style={[styles.card, styles.preview]}>
        <View style={styles.previewIcon}>
          <Ionicons name="wallet" size={18} color={colors.onPrimary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.previewApp}>Dépenses Perso · {formatReminderTime(settings)}</Text>
          <Text style={styles.previewTitle}>{REMINDER_TITLE}</Text>
          <Text style={styles.hint}>{REMINDER_BODY}</Text>
        </View>
      </View>

      <Text style={styles.note}>
        Pas de rappel les jours où tu as déjà noté une opération. Toucher le rappel ouvre directement la saisie.
      </Text>
    </ScrollView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 10, paddingBottom: 32 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 16,
    },
    switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    flex: { flex: 1, gap: 2 },
    title: { color: c.text, fontSize: 16, fontWeight: "700" },
    hint: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
    warning: { flexDirection: "row", alignItems: "center", gap: 12, borderColor: c.danger },
    warningText: { color: c.danger, fontSize: 13, lineHeight: 18 },
    section: { marginTop: 10, marginLeft: 4, color: c.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
    hours: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    hour: {
      minWidth: 64,
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    hourSelected: { borderColor: c.primary, backgroundColor: `${c.primary}1A` },
    hourText: { color: c.text, fontSize: 15, fontWeight: "600" },
    hourTextSelected: { color: c.primary, fontWeight: "700" },
    preview: { flexDirection: "row", gap: 12 },
    previewIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    previewApp: { color: c.textMuted, fontSize: 12 },
    previewTitle: { color: c.text, fontSize: 15, fontWeight: "700" },
    note: { color: c.textMuted, fontSize: 13, lineHeight: 18, marginHorizontal: 4, marginTop: 4 },
  });
