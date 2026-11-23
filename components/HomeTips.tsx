/**
 * Une carte de conseil à la fois sur l'accueil :
 * 0. Premiers pas (nouvel utilisateur) : « Touche ＋ … », puis « Bravo »
 *    après la première opération ;
 * 1. « Un rappel le soir ? » tant que l'utilisateur n'a pas répondu ;
 *    la fenêtre de permission d'Android n'apparaît qu'après « Oui ».
 * 2. « Mets tes données à l'abri » quand il y a des données à perdre et
 *    qu'aucune sauvegarde n'est partie hors du téléphone depuis 30 jours.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { type Palette, useColors } from "@/constants/theme";
import { countTransactions } from "@/db/backup";
import {
  DEFAULT_REMINDER_TIME,
  finishFirstSteps,
  getLastSharedBackup,
  getReminderSettings,
  getShareReminderSnooze,
  hasFirstStepsPending,
  markReminderOffered,
  snoozeShareReminder,
  wasReminderOffered,
} from "@/db/settings";
import { shareBackup } from "@/utils/dataFiles";
import { pickTip, SNOOZE_DAYS, type Tip } from "@/utils/homeTips";
import { formatReminderTime } from "@/utils/reminderSchedule";
import { enableDefaultReminder } from "@/utils/reminders";

export default function HomeTips() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tip, setTip] = useState<Tip>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    try {
      const reminder = getReminderSettings();
      setTip(
        pickTip({
          firstSteps: hasFirstStepsPending(),
          reminderOffered: wasReminderOffered(),
          reminderEnabled: reminder.enabled,
          operations: countTransactions(),
          lastShared: getLastSharedBackup(),
          snoozedUntil: getShareReminderSnooze(),
          now: new Date(),
        }),
      );
    } catch {
      setTip(null);
    }
  }, []);
  useFocusEffect(refresh);

  const acceptReminder = async () => {
    setBusy(true);
    try {
      if (await enableDefaultReminder()) {
        Alert.alert("C’est noté", `Rappel chaque soir à ${formatReminderTime(DEFAULT_REMINDER_TIME)}. L’heure se change dans Réglages.`);
      } else {
        Alert.alert(
          "Notifications bloquées",
          "Le téléphone n’autorise pas les notifications de l’app. Tu peux les activer dans ses réglages, puis le rappel dans Réglages › Rappel du soir.",
          [
            { text: "Plus tard", style: "cancel" },
            { text: "Ouvrir les réglages", onPress: () => void Linking.openSettings() },
          ],
        );
      }
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const decline = () => {
    try {
      if (tip === "reminder") markReminderOffered();
      else snoozeShareReminder(new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000).toISOString());
    } catch {
      // Sans gravité : la carte reviendra.
    }
    refresh();
  };

  const share = () => {
    setBusy(true);
    shareBackup()
      .catch(() => Alert.alert("Opération impossible", "Le fichier n'a pas pu être créé. Réessaie."))
      .finally(() => {
        setBusy(false);
        refresh();
      });
  };

  const closeFirstSteps = () => {
    try {
      finishFirstSteps();
    } catch {
      // Sans gravité : la carte reviendra.
    }
    refresh();
  };

  if (tip === null) return null;

  if (tip === "start" || tip === "firstDone") {
    const start = tip === "start";
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name={start ? "arrow-down" : "checkmark-done"} size={22} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.title}>{start ? "C’est parti !" : "Bravo, ta première opération est notée"}</Text>
            <Text style={styles.text}>
              {start
                ? "Touche le bouton ＋ en bas de l’écran pour noter ta première dépense."
                : "Une erreur ? Touche l’opération dans « Récentes » pour la modifier ou la supprimer."}
            </Text>
          </View>
        </View>
        {!start && (
          <Pressable onPress={closeFirstSteps} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>Compris</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const reminder = tip === "reminder";

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name={reminder ? "notifications-outline" : "shield-checkmark-outline"} size={22} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>{reminder ? "Un rappel le soir ?" : "Mets tes données à l’abri"}</Text>
          <Text style={styles.text}>
            {reminder
              ? `Chaque soir à ${formatReminderTime(DEFAULT_REMINDER_TIME)}, seulement si tu n’as rien noté de la journée.`
              : "Envoie une sauvegarde sur Drive ou WhatsApp : si tu perds ton téléphone, tu pourras tout récupérer."}
          </Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Pressable onPress={decline} style={styles.secondary} accessibilityRole="button" disabled={busy}>
          <Text style={styles.secondaryText}>{reminder ? "Non merci" : "Plus tard"}</Text>
        </Pressable>
        <Pressable
          onPress={reminder ? () => void acceptReminder() : share}
          style={styles.primary}
          accessibilityRole="button"
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.primaryText}>
              {reminder ? `Oui, à ${formatReminderTime(DEFAULT_REMINDER_TIME)}` : "Envoyer"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: `${c.primary}40`,
      padding: 16,
      gap: 14,
    },
    row: { flexDirection: "row", gap: 12 },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${c.primary}1A`,
      alignItems: "center",
      justifyContent: "center",
    },
    flex: { flex: 1, gap: 3 },
    title: { color: c.text, fontSize: 16, fontWeight: "700" },
    text: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
    buttons: { flexDirection: "row", gap: 10 },
    secondary: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryText: { color: c.text, fontSize: 14, fontWeight: "600" },
    primary: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: { color: c.onPrimary, fontSize: 14, fontWeight: "700" },
  });
