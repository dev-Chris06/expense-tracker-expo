/**
 * Palettes claire et sombre. Les écrans lisent les couleurs via useColors()
 * au lieu de les coder en dur, ce qui permet de suivre le thème du système.
 */
import { Appearance, useColorScheme } from "react-native";

import type { ThemePreference } from "@/db/settings";

export interface Palette {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  link: string;
  danger: string;
  /** Revenus, solde positif */
  success: string;
  /** Budget presque atteint (80 %) */
  warning: string;
  heroBackground: string;
  heroText: string;
  heroTextMuted: string;
  barTrack: string;
}

export const lightColors: Palette = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#D0D5DD",
  text: "#101828",
  textMuted: "#667085",
  primary: "#175CD3",
  onPrimary: "#FFFFFF",
  link: "#175CD3",
  danger: "#B42318",
  success: "#067647",
  warning: "#B54708",
  heroBackground: "#102A43",
  heroText: "#FFFFFF",
  heroTextMuted: "#D9EAF7",
  barTrack: "#EAECF0",
};

export const darkColors: Palette = {
  background: "#0B1220",
  surface: "#162032",
  border: "#2E3A4F",
  text: "#F2F4F7",
  textMuted: "#98A2B3",
  primary: "#2E90FA",
  onPrimary: "#FFFFFF",
  link: "#84CAFF",
  danger: "#F97066",
  success: "#47CD89",
  warning: "#FDB022",
  heroBackground: "#1D3A5F",
  heroText: "#FFFFFF",
  heroTextMuted: "#D9EAF7",
  barTrack: "#2E3A4F",
};

export function useColors(): Palette {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}

/**
 * Force le thème de toute l'app, y compris les fenêtres natives (sélecteur
 * de date…) ; "system" rend la main au réglage du téléphone.
 */
export function applyThemePreference(preference: ThemePreference): void {
  Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
}
