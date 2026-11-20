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
 *
 * <Stack> fournit une navigation en pile : la saisie, la modification et
 * les catégories s'empilent par-dessus les onglets. Le ThemeProvider aligne
 * les en-têtes de navigation sur le thème clair/sombre.
 */
import { useState } from "react";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";

import { applyThemePreference, darkColors, lightColors } from "@/constants/theme";
import { applyDueRecurrences } from "@/db/recurrences";
import { getCurrencyCode, getThemePreference } from "@/db/settings";
import { setCurrentCurrency } from "@/utils/currency";

/**
 * Avant le premier affichage : thème et devise choisis dans les réglages,
 * puis opérations récurrentes arrivées à échéance.
 */
function applySavedSettings(): boolean {
  // Chaque étape est indépendante : si la base est illisible, on garde le
  // thème du téléphone et le franc CFA, et les écrans afficheront eux-mêmes
  // leur erreur de chargement.
  for (const step of [
    () => applyThemePreference(getThemePreference()),
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
      </Stack>
    </ThemeProvider>
  );
}
