/**
 * Layout racine d'Expo Router.
 *
 * Chaque fichier dans app/ devient automatiquement une route
 * (routing basé sur les fichiers, comme Next.js) :
 *   app/index.tsx     → "/"
 *   app/add.tsx       → "/add"
 *   app/list.tsx      → "/list"
 *   app/stats.tsx     → "/stats"
 *   app/settings.tsx  → "/settings"
 *   app/categories.tsx → "/categories"
 *   app/category/[id].tsx → "/category/3" ou "/category/new"
 *   app/edit/[id].tsx → "/edit/42" (route dynamique, id récupérable)
 *
 * <Stack> fournit une navigation en pile : chaque écran s'empile sur le
 * précédent avec un bouton retour automatique. Le ThemeProvider aligne les
 * en-têtes de navigation sur le thème clair/sombre du système.
 */
import { useState } from "react";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";

import { applyThemePreference, darkColors, lightColors } from "@/constants/theme";
import { getThemePreference } from "@/db/settings";

/** Applique le thème choisi dans les réglages avant le premier affichage. */
function applySavedTheme(): boolean {
  try {
    applyThemePreference(getThemePreference());
  } catch {
    // Base illisible : on garde le thème du téléphone, les écrans
    // afficheront eux-mêmes leur erreur de chargement.
  }
  return true;
}

export default function RootLayout() {
  useState(applySavedTheme);
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
        <Stack.Screen name="index" options={{ title: "Accueil" }} />
        <Stack.Screen name="add" options={{ title: "Nouvelle opération" }} />
        <Stack.Screen name="list" options={{ title: "Mes opérations" }} />
        <Stack.Screen name="stats" options={{ title: "Statistiques" }} />
        <Stack.Screen name="settings" options={{ title: "Réglages" }} />
        <Stack.Screen name="categories" options={{ title: "Catégories" }} />
        <Stack.Screen name="category/[id]" options={{ title: "Catégorie" }} />
        <Stack.Screen name="edit/[id]" options={{ title: "Modifier" }} />
      </Stack>
    </ThemeProvider>
  );
}
