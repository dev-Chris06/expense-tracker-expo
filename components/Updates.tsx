/**
 * Interface des mises à jour sur l'accueil :
 * - UpdateBanner : vérifie une fois par lancement et signale une nouvelle
 *   version (masquable jusqu'au prochain lancement) ;
 * - UpdateFooter : version installée + vérification à la demande.
 */
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { type Palette, useColors } from "@/constants/theme";
import { apkDownloadUrl, checkForUpdate, installedVersion } from "@/utils/updates";

// Partagé entre les montages de l'accueil : une seule vérification
// automatique par lancement, et « Plus tard » tient jusqu'au suivant.
let autoCheck: Promise<string | null> | null = null;
let dismissed = false;

async function openDownload(version: string) {
  try {
    await Linking.openURL(apkDownloadUrl(version));
  } catch {
    Alert.alert("Mise à jour", "Impossible d’ouvrir le lien de téléchargement.");
  }
}

export function UpdateBanner() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    autoCheck ??= checkForUpdate().then((result) => (result.outcome === "available" ? result.version : null));
    autoCheck.then((latest) => {
      if (active && !dismissed) setVersion(latest);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!version) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerTitle}>Nouvelle version {version} disponible</Text>
      <Text style={styles.bannerText}>Télécharge l’APK puis ouvre-le pour mettre l’app à jour.</Text>
      <View style={styles.bannerActions}>
        <Pressable
          onPress={() => {
            dismissed = true;
            setVersion(null);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.bannerLater}>Plus tard</Text>
        </Pressable>
        <Pressable style={styles.bannerButton} onPress={() => openDownload(version)} accessibilityRole="button">
          <Text style={styles.bannerButtonText}>Télécharger</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function UpdateFooter() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [checking, setChecking] = useState(false);
  const version = installedVersion();

  const check = async () => {
    if (checking) return;
    setChecking(true);
    const result = await checkForUpdate();
    setChecking(false);
    switch (result.outcome) {
      case "available":
        Alert.alert("Mise à jour disponible", `La version ${result.version} est disponible.`, [
          { text: "Plus tard", style: "cancel" },
          { text: "Télécharger", onPress: () => openDownload(result.version) },
        ]);
        break;
      case "upToDate":
        Alert.alert("Mise à jour", "L’application est à jour.");
        break;
      case "failed":
        Alert.alert("Mise à jour", "Vérification impossible. Vérifie ta connexion et réessaie.");
        break;
      case "unsupported":
        Alert.alert("Mise à jour", "Disponible uniquement dans l’application Android.");
        break;
    }
  };

  return (
    <View style={styles.footer}>
      <Pressable
        style={styles.footerButton}
        onPress={check}
        disabled={checking}
        accessibilityRole="button"
        accessibilityState={{ busy: checking }}
      >
        {checking ? (
          <ActivityIndicator color={colors.link} />
        ) : (
          <Text style={styles.footerButtonText}>Rechercher une mise à jour</Text>
        )}
      </Pressable>
      {version && <Text style={styles.footerVersion}>Version {version}</Text>}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    banner: { backgroundColor: c.surface, borderColor: c.primary, borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
    bannerTitle: { color: c.text, fontWeight: "700", fontSize: 16 },
    bannerText: { color: c.textMuted, fontSize: 14 },
    bannerActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 18, marginTop: 6 },
    bannerLater: { color: c.textMuted, fontWeight: "700" },
    bannerButton: { backgroundColor: c.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
    bannerButtonText: { color: c.onPrimary, fontWeight: "700" },
    footer: { marginTop: 24, alignItems: "center", gap: 6 },
    footerButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
    footerButtonText: { color: c.link, fontWeight: "700" },
    footerVersion: { color: c.textMuted, fontSize: 13 },
  });
