/**
 * Layout racine d'Expo Router.
 *
 * Chaque fichier dans app/ devient automatiquement une route
 * (routing basé sur les fichiers, comme Next.js) :
 *   app/index.tsx     → "/"
 *   app/add.tsx       → "/add"
 *   app/list.tsx      → "/list"
 *   app/edit/[id].tsx → "/edit/42" (route dynamique, id récupérable)
 *
 * <Stack> fournit une navigation en pile : chaque écran s'empile sur le
 * précédent avec un bouton retour automatique.
 */
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Accueil" }} />
      <Stack.Screen name="add" options={{ title: "Ajouter une dépense" }} />
      <Stack.Screen name="list" options={{ title: "Mes dépenses" }} />
      <Stack.Screen name="edit/[id]" options={{ title: "Modifier" }} />
    </Stack>
  );
}
