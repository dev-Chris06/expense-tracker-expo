/**
 * Barre d'onglets du bas : Accueil, Opérations, [＋], Stats, Réglages.
 *
 * Le ＋ central n'est pas un onglet : il ouvre l'écran de saisie par-dessus
 * les onglets (route /add de la pile racine).
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { type BottomTabBarProps } from "expo-router/js-tabs";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type Palette, useColors } from "@/constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: "Accueil", icon: "home-outline", iconActive: "home" },
  list: { label: "Opérations", icon: "list-outline", iconActive: "list" },
  stats: { label: "Stats", icon: "pie-chart-outline", iconActive: "pie-chart" },
  settings: { label: "Réglages", icon: "options-outline", iconActive: "options" },
};

export default function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const tab = (index: number) => {
    const route = state.routes[index];
    const config = TABS[route.name];
    if (!config) return null;
    const focused = state.index === index;
    const onPress = () => {
      const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    const color = focused ? colors.primary : colors.textMuted;
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        style={styles.tab}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={config.label}
      >
        <Ionicons name={focused ? config.iconActive : config.icon} size={23} color={color} />
        {/* Texte agrandi limité ici (comme les apps Android) : sinon « Opérations » se coupe en deux. */}
        <Text
          style={[styles.label, { color }, focused && styles.labelActive]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          adjustsFontSizeToFit
        >
          {config.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]} accessibilityRole="tablist">
      {tab(0)}
      {tab(1)}
      <View style={styles.tab}>
        <Pressable
          onPress={() => router.push("/add")}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une opération"
        >
          <Ionicons name="add" size={30} color={colors.onPrimary} />
        </Pressable>
      </View>
      {tab(2)}
      {tab(3)}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: 6,
    },
    tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, minHeight: 52 },
    label: { fontSize: 11, fontWeight: "600" },
    labelActive: { fontWeight: "700" },
    fab: {
      width: 58,
      height: 58,
      borderRadius: 29,
      marginTop: -26,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 4,
      borderColor: c.background,
      elevation: 6,
      shadowColor: c.primary,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    fabPressed: { opacity: 0.85 },
  });
