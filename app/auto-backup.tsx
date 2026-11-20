/**
 * Sauvegardes : automatique (chaque semaine, dans un dossier du téléphone)
 * et envoi hors du téléphone (Drive, WhatsApp…), seule vraie protection
 * contre la perte ou le vol du téléphone.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { type Palette, useColors } from "@/constants/theme";
import { type AutoBackupState, getAutoBackupState, getLastSharedBackup, setAutoBackupFolder } from "@/db/settings";
import { chooseBackupFolder, folderLabel, writeAutoBackup } from "@/utils/autoBackup";
import { shareBackup } from "@/utils/dataFiles";
import { formatDateTime } from "@/utils/dateHelpers";
import { UserFacingError } from "@/utils/errors";

type Busy = "folder" | "now" | "share" | null;

export default function AutoBackupScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [state, setState] = useState<AutoBackupState>(getAutoBackupState);
  const [lastShared, setLastShared] = useState<string | null>(getLastSharedBackup);
  const [busy, setBusy] = useState<Busy>(null);

  const reload = useCallback(() => {
    setState(getAutoBackupState());
    setLastShared(getLastSharedBackup());
  }, []);
  useFocusEffect(reload);

  const run = (kind: Exclude<Busy, null>, task: () => Promise<unknown>, failure: string) => {
    if (busy) return;
    setBusy(kind);
    task()
      .catch((e: unknown) => Alert.alert("Opération impossible", e instanceof UserFacingError ? e.message : failure))
      .finally(() => {
        setBusy(null);
        reload();
      });
  };

  const stop = () =>
    Alert.alert(
      "Arrêter la sauvegarde automatique ?",
      "Les sauvegardes déjà faites restent dans le dossier.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Arrêter",
          style: "destructive",
          onPress: () => {
            setAutoBackupFolder(null);
            reload();
          },
        },
      ],
    );

  const folder = state.folder;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.section}>SAUVEGARDE AUTOMATIQUE</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons
            name={folder ? (state.error ? "alert-circle" : "checkmark-circle") : "time-outline"}
            size={24}
            color={folder ? (state.error ? colors.danger : colors.success) : colors.textMuted}
          />
          <View style={styles.flex}>
            <Text style={styles.title}>{folder ? "Activée, chaque semaine" : "Désactivée"}</Text>
            <Text style={styles.hint}>
              {folder
                ? `Dossier : ${folderLabel(folder)}`
                : "Une fois par semaine, à l’ouverture de l’app, une sauvegarde est rangée dans le dossier de ton choix. Les 5 dernières sont gardées."}
            </Text>
            {folder && !state.error && (
              <Text style={styles.hint}>
                Dernière : {state.last ? formatDateTime(state.last) : "pas encore faite"}
              </Text>
            )}
            {state.error && <Text style={styles.error}>{state.error}</Text>}
          </View>
        </View>

        {folder ? (
          <View style={styles.actions}>
            <ActionButton
              label="Sauvegarder maintenant"
              icon="save-outline"
              busy={busy === "now"}
              onPress={() =>
                run("now", () => writeAutoBackup(folder), "Le dossier n'est plus accessible. Choisis-le à nouveau.")
              }
            />
            <ActionButton
              label="Changer de dossier"
              icon="folder-open-outline"
              busy={busy === "folder"}
              onPress={() => run("folder", chooseBackupFolder, "Impossible d'écrire dans ce dossier.")}
              secondary
            />
            <Pressable onPress={stop} style={styles.stop} accessibilityRole="button">
              <Text style={styles.stopText}>Arrêter la sauvegarde automatique</Text>
            </Pressable>
          </View>
        ) : (
          <ActionButton
            label="Choisir un dossier"
            icon="folder-open-outline"
            busy={busy === "folder"}
            onPress={() => run("folder", chooseBackupFolder, "Impossible d'écrire dans ce dossier.")}
          />
        )}
      </View>
      <Text style={styles.note}>
        Conseil : crée un dossier « Dépenses Perso » dans Documents. Ces sauvegardes te protègent d’une
        fausse manipulation ou d’une désinstallation, mais restent sur le téléphone.
      </Text>

      <Text style={styles.section}>HORS DU TÉLÉPHONE</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
          <View style={styles.flex}>
            <Text style={styles.title}>Envoyer une sauvegarde</Text>
            <Text style={styles.hint}>
              Sur Drive, WhatsApp ou par e-mail : si tu perds ton téléphone, tu pourras tout récupérer sur un nouveau.
            </Text>
            <Text style={styles.hint}>Dernier envoi : {lastShared ? formatDateTime(lastShared) : "jamais"}</Text>
          </View>
        </View>
        <ActionButton
          label="Envoyer une sauvegarde"
          icon="share-outline"
          busy={busy === "share"}
          onPress={() => run("share", shareBackup, "Le fichier n'a pas pu être créé. Réessaie.")}
        />
      </View>
      <Text style={styles.note}>
        Pour tout récupérer : installe l’app sur le nouveau téléphone, puis Réglages › Restaurer une sauvegarde.
      </Text>
    </ScrollView>
  );
}

function ActionButton(props: {
  label: string;
  icon: "save-outline" | "folder-open-outline" | "share-outline";
  busy: boolean;
  onPress: () => void;
  secondary?: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const color = props.secondary ? colors.primary : colors.onPrimary;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.busy}
      style={({ pressed }) => [styles.button, props.secondary && styles.buttonSecondary, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ busy: props.busy }}
    >
      {props.busy ? <ActivityIndicator color={color} /> : <Ionicons name={props.icon} size={18} color={color} />}
      <Text style={[styles.buttonText, { color }]}>{props.label}</Text>
    </Pressable>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 10, paddingBottom: 32 },
    section: { marginTop: 6, marginLeft: 4, color: c.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 16,
      gap: 14,
    },
    row: { flexDirection: "row", gap: 12 },
    flex: { flex: 1, gap: 3 },
    title: { color: c.text, fontSize: 16, fontWeight: "700" },
    hint: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
    error: { color: c.danger, fontSize: 13, lineHeight: 18, fontWeight: "600" },
    actions: { gap: 8 },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    buttonSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: c.primary },
    buttonText: { fontSize: 15, fontWeight: "700" },
    pressed: { opacity: 0.7 },
    stop: { alignSelf: "center", paddingVertical: 8 },
    stopText: { color: c.danger, fontSize: 14, fontWeight: "600" },
    note: { color: c.textMuted, fontSize: 13, lineHeight: 18, marginHorizontal: 4 },
  });
