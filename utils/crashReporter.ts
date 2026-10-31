/**
 * En build release, une erreur JavaScript non rattrapée ferme l'app sans
 * explication. Ce gestionnaire affiche plutôt l'erreur dans une boîte de
 * dialogue : l'app reste ouverte et le message peut être signalé.
 * En développement, on garde l'écran d'erreur habituel d'Expo.
 */
import { Alert } from "react-native";

const previousHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
  if (__DEV__ || !isFatal) {
    previousHandler(error, isFatal);
    return;
  }
  const err = error instanceof Error ? error : new Error(String(error));
  const stack = (err.stack ?? "").split("\n").slice(0, 6).join("\n");
  Alert.alert("Erreur inattendue", `${err.message}\n\n${stack}`);
});
