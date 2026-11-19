/**
 * Groupe d'onglets : le dossier "(tabs)" n'apparaît pas dans les URL, les
 * écrans restent "/", "/list", "/stats" et "/settings".
 *
 * Les onglets n'ont pas d'en-tête de navigation : chaque écran affiche son
 * propre titre. La barre du bas est dessinée par components/TabBar.
 */
import { Tabs } from "expo-router";

import TabBar from "@/components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="list" options={{ title: "Opérations" }} />
      <Tabs.Screen name="stats" options={{ title: "Statistiques" }} />
      <Tabs.Screen name="settings" options={{ title: "Réglages" }} />
    </Tabs>
  );
}
