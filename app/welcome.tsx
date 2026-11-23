/**
 * Accueil du premier lancement, en 3 écrans courts :
 * 1. ce que fait l'app (et « J'ai déjà une sauvegarde » pour qui change de
 *    téléphone) ;
 * 2. la devise choisie d'après le pays, à vérifier ;
 * 3. le rappel du soir (la fenêtre d'autorisation d'Android vient après « Oui »).
 * « Passer » est toujours possible : rien ici n'est obligatoire.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { type Palette, useColors } from "@/constants/theme";
import { DEFAULT_REMINDER_TIME, markReminderOffered, markWelcomeDone } from "@/db/settings";
import { useCurrency } from "@/utils/currency";
import { UserFacingError } from "@/utils/errors";
import { formatAmount } from "@/utils/formatters";
import { detectLocalCurrency } from "@/utils/localCurrency";
import { formatReminderTime } from "@/utils/reminderSchedule";
import { enableDefaultReminder } from "@/utils/reminders";
import { chooseAndRestore } from "@/utils/restoreFlow";
import { setWelcomePending } from "@/utils/welcome";

type IconName = ComponentProps<typeof Ionicons>["name"];
const STEPS = 3;

/** Fin de l'accueil : la navigation racine affiche alors les onglets. */
function finish(firstSteps: boolean): void {
  try {
    markWelcomeDone(firstSteps);
  } catch {
    // Base illisible : l'accueil reviendra au prochain lancement, sans gravité.
  }
  setWelcomePending(false);
}

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currency = useCurrency();
  const [local] = useState(detectLocalCurrency);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const reminderTime = formatReminderTime(DEFAULT_REMINDER_TIME);

  // Retour Android : écran précédent (au premier, comportement normal).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === 0) return false;
      setStep(step - 1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const restore = () => {
    setBusy(true);
    chooseAndRestore(() => finish(false))
      .catch((e: unknown) =>
        Alert.alert("Opération impossible", e instanceof UserFacingError ? e.message : "Le fichier n'a pas pu être lu. Réessaie."),
      )
      .finally(() => setBusy(false));
  };

  const acceptReminder = async () => {
    setBusy(true);
    const enabled = await enableDefaultReminder();
    setBusy(false);
    if (enabled) {
      finish(true);
      return;
    }
    Alert.alert(
      "Notifications bloquées",
      "Le téléphone n’autorise pas les notifications de l’app. Tu pourras activer le rappel plus tard dans Réglages › Rappel du soir.",
      [
        { text: "Continuer", onPress: () => finish(true) },
        {
          text: "Ouvrir les réglages",
          onPress: () => {
            void Linking.openSettings();
            finish(true);
          },
        },
      ],
    );
  };

  const declineReminder = () => {
    try {
      markReminderOffered();
    } catch {
      // La carte de l'accueil le reproposera, sans gravité.
    }
    finish(true);
  };

  const countryHint =
    local && local.currency.code === currency.code && local.country
      ? `Choisie d’après ton pays : ${local.country}`
      : currency.pays.slice(0, 3).join(", ");

  const pages: { icon: IconName; title: string; body: React.ReactNode }[] = [
    {
      icon: "wallet-outline",
      title: "Note tes dépenses en 10 secondes",
      body: (
        <View style={styles.points}>
          <Point styles={styles} color={colors.primary} icon="person-outline" text="Sans compte, sans inscription" />
          <Point styles={styles} color={colors.primary} icon="cloud-offline-outline" text="Marche sans internet" />
          <Point styles={styles} color={colors.primary} icon="lock-closed-outline" text="Tes données restent sur ton téléphone" />
          <Point styles={styles} color={colors.primary} icon="pie-chart-outline" text="Vois où part ton argent chaque mois" />
        </View>
      ),
    },
    {
      icon: "cash-outline",
      title: "Ta devise",
      body: (
        <>
          <Text style={styles.text}>Tous les montants s’afficheront dans cette devise.</Text>
          <View style={styles.currency}>
            <View style={styles.symbol}>
              <Text style={styles.symbolText} numberOfLines={1} adjustsFontSizeToFit>
                {currency.symbole}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.currencyName}>{currency.nom}</Text>
              <Text style={styles.muted}>
                {currency.code} · {formatAmount(1500 * 10 ** currency.decimales, currency)}
              </Text>
              <Text style={styles.muted} numberOfLines={2}>
                {countryHint}
              </Text>
            </View>
          </View>
        </>
      ),
    },
    {
      icon: "notifications-outline",
      title: "Un rappel le soir ?",
      body: (
        <Text style={styles.text}>
          Chaque soir à {reminderTime}, seulement si tu n’as rien noté de la journée. L’heure se change dans Réglages.
        </Text>
      ),
    },
  ];
  const page = pages[step];

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.top}>
        <View style={styles.dots} accessibilityLabel={`Étape ${step + 1} sur ${STEPS}`}>
          {pages.map((p, i) => (
            <View key={p.title} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        {step < STEPS - 1 && (
          <Pressable onPress={() => finish(true)} hitSlop={12} accessibilityRole="button" disabled={busy}>
            <Text style={styles.skip}>Passer</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Ionicons name={page.icon} size={44} color={colors.primary} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {page.title}
        </Text>
        {page.body}
      </ScrollView>

      <View style={styles.footer}>
        {step === 0 && (
          <>
            <Button styles={styles} label="Commencer" onPress={() => setStep(1)} disabled={busy} />
            <Pressable onPress={restore} style={styles.linkButton} accessibilityRole="button" disabled={busy}>
              {busy ? (
                <ActivityIndicator color={colors.link} />
              ) : (
                <Text style={styles.link}>J’ai déjà une sauvegarde</Text>
              )}
            </Pressable>
          </>
        )}
        {step === 1 && (
          <>
            <Button styles={styles} label="Continuer" onPress={() => setStep(2)} />
            <Button styles={styles} label="Changer de devise" secondary onPress={() => router.push("/currency")} />
          </>
        )}
        {step === 2 && (
          <>
            <Button
              styles={styles}
              label={busy ? "" : `Oui, à ${reminderTime}`}
              onPress={() => void acceptReminder()}
              disabled={busy}
              loading={busy}
              color={colors.onPrimary}
            />
            <Button styles={styles} label="Plus tard" secondary onPress={declineReminder} disabled={busy} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof createStyles>;

function Point(props: { styles: Styles; color: string; icon: IconName; text: string }) {
  return (
    <View style={props.styles.point}>
      <Ionicons name={props.icon} size={22} color={props.color} />
      <Text style={props.styles.pointText}>{props.text}</Text>
    </View>
  );
}

function Button(props: {
  styles: Styles;
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
}) {
  const { styles } = props;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityRole="button"
      style={({ pressed }) => [props.secondary ? styles.secondary : styles.primary, pressed && styles.pressed]}
    >
      {props.loading ? (
        <ActivityIndicator color={props.color} />
      ) : (
        <Text style={props.secondary ? styles.secondaryText : styles.primaryText}>{props.label}</Text>
      )}
    </Pressable>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    top: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingTop: 8,
      minHeight: 48,
    },
    dots: { flexDirection: "row", gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
    dotActive: { width: 22, backgroundColor: c.primary },
    skip: { color: c.textMuted, fontSize: 15, fontWeight: "600" },
    content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 16, gap: 18 },
    badge: {
      width: 88,
      height: 88,
      borderRadius: 26,
      backgroundColor: `${c.primary}1A`,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { color: c.text, fontSize: 28, fontWeight: "800", lineHeight: 34 },
    text: { color: c.textMuted, fontSize: 16, lineHeight: 23 },
    muted: { color: c.textMuted, fontSize: 13 },
    points: { gap: 14 },
    point: { flexDirection: "row", alignItems: "center", gap: 14 },
    pointText: { flex: 1, color: c.text, fontSize: 16, lineHeight: 22 },
    currency: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 16,
    },
    symbol: {
      width: 56,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    symbolText: { color: c.text, fontSize: 18, fontWeight: "700" },
    flex: { flex: 1, gap: 2 },
    currencyName: { color: c.text, fontSize: 17, fontWeight: "700" },
    footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8, gap: 10 },
    primary: {
      minHeight: 54,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: { color: c.onPrimary, fontSize: 16, fontWeight: "700" },
    secondary: {
      minHeight: 54,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryText: { color: c.text, fontSize: 16, fontWeight: "600" },
    linkButton: { minHeight: 48, alignItems: "center", justifyContent: "center" },
    link: { color: c.link, fontSize: 15, fontWeight: "700" },
    pressed: { opacity: 0.85 },
  });
