/**
 * Layout racine d'Expo Router.
 *
 * Chaque fichier dans app/ devient automatiquement une route
 * (routing basé sur les fichiers, comme Next.js) :
 *   app/(tabs)/index.tsx    → "/"          ┐
 *   app/(tabs)/list.tsx     → "/list"      │ onglets du bas,
 *   app/(tabs)/stats.tsx    → "/stats"     │ voir app/(tabs)/_layout.tsx
 *   app/(tabs)/settings.tsx → "/settings"  ┘
 *   app/add.tsx       → "/add" (saisie rapide, ouverte par le ＋)
 *   app/edit/[id].tsx → "/edit/42" (route dynamique, id récupérable)
 *   app/budget.tsx    → "/budget" (budget global du mois)
 *   app/categories.tsx → "/categories"
 *   app/category/[id].tsx → "/category/3" ou "/category/new"
 *   app/currency.tsx  → "/currency" (choix de la devise)
 *   app/recurring.tsx → "/recurring" (opérations récurrentes)
 *   app/reminder.tsx  → "/reminder" (rappel du soir)
 *   app/auto-backup.tsx → "/auto-backup" (sauvegardes)
 *
 * <Stack> fournit une navigation en pile : la saisie, la modification et
 * les catégories s'empilent par-dessus les onglets. Le ThemeProvider aligne
 * les en-têtes de navigation sur le thème clair/sombre.
 */
import { useEffect, useState } from "react";
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { AppState, useColorScheme } from "react-native";

import { applyThemePreference, darkColors, lightColors } from "@/constants/theme";
import { findCurrency } from "@/constants/currencies";
import { countTransactions } from "@/db/backup";
import { applyDueRecurrences } from "@/db/recurrences";
import { changeCurrency, getCurrencyCode, getThemePreference, hasCurrencySetting } from "@/db/settings";
import { setCurrentCurrency } from "@/utils/currency";
import { runAutoBackupIfDue } from "@/utils/autoBackup";
import { detectLocalCurrency } from "@/utils/localCurrency";
import { REMINDER_URL, syncRemindersQuietly } from "@/utils/reminders";

// Rappel reçu pendant que l'app est ouverte : affiché quand même.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Toucher le rappel du soir ouvre la saisie, app fermée ou non. */
function openFromNotification(response: Notifications.NotificationResponse | null): void {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  if (response.notification.request.content.data?.url === REMINDER_URL) {
    Notifications.clearLastNotificationResponse();
    router.push(REMINDER_URL);
  }
}

/**
 * Au démarrage et à chaque retour dans l'app : récurrences arrivées à
 * échéance, rappels des prochains jours, sauvegarde automatique si due.
 */
function useAppLifecycle(): void {
  useEffect(() => {
    openFromNotification(Notifications.getLastNotificationResponse());
    const tapped = Notifications.addNotificationResponseReceivedListener(openFromNotification);

    const refresh = () => {
      syncRemindersQuietly();
      void runAutoBackupIfDue();
    };
    refresh();
    const appState = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      try {
        applyDueRecurrences();
      } catch {
        // Réessayé à l'affichage de l'accueil.
      }
      refresh();
    });
    return () => {
      tapped.remove();
      appState.remove();
    };
  }, []);
}

/**
 * Premier lancement (aucune devise choisie, aucune opération) : prend la
 * devise du pays réglé dans le téléphone. Une app déjà utilisée garde sa
 * devise : on ne change jamais la signification de montants existants.
 */
function chooseFirstCurrency(): void {
  if (hasCurrencySetting() || countTransactions() > 0) return;
  changeCurrency(findCurrency(null), detectLocalCurrency()?.currency ?? findCurrency(null));
}

/**
 * Avant le premier affichage : thème et devise (celle du pays au premier
 * lancement), puis opérations récurrentes arrivées à échéance.
 */
function applySavedSettings(): boolean {
  // Chaque étape est indépendante : si la base est illisible, on garde le
  // thème du téléphone et le franc CFA, et les écrans afficheront eux-mêmes
  // leur erreur de chargement.
  for (const step of [
    () => applyThemePreference(getThemePreference()),
    chooseFirstCurrency,
    () => setCurrentCurrency(getCurrencyCode()),
    () => applyDueRecurrences(),
  ]) {
    try {
      step();
    } catch {
      // Voir plus haut.
    }
  }
  return true;
}

export default function RootLayout() {
  useState(applySavedSettings);
  useAppLifecycle();
  const dark = useColorScheme() === "dark";
  const base = dark ? DarkTheme : DefaultTheme;
  const palette = dark ? darkColors : lightColors;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      primary: palette.primary,
    },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Accueil" }} />
        <Stack.Screen
          name="add"
          options={{ headerShown: false, title: "Nouvelle opération", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="edit/[id]" options={{ headerShown: false, title: "Modifier" }} />
        <Stack.Screen name="budget" options={{ headerShown: false, title: "Budget du mois" }} />
        <Stack.Screen name="categories" options={{ title: "Catégories" }} />
        <Stack.Screen name="category/[id]" options={{ title: "Catégorie" }} />
        <Stack.Screen name="currency" options={{ title: "Devise" }} />
        <Stack.Screen name="recurring" options={{ title: "Opérations récurrentes" }} />
        <Stack.Screen name="reminder" options={{ title: "Rappel du soir" }} />
        <Stack.Screen name="auto-backup" options={{ title: "Sauvegarde" }} />
      </Stack>
    </ThemeProvider>
  );
}
