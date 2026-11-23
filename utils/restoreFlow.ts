/**
 * Restauration complète, partagée par les Réglages et l'accueil du premier
 * lancement : choix du fichier, confirmation, remplacement des données,
 * puis thème, devise, récurrences et rappels remis d'après la sauvegarde.
 */
import { Alert } from "react-native";

import { countTransactions, restoreBackup } from "@/db/backup";
import { applyDueRecurrences } from "@/db/recurrences";
import { getCurrencyCode, getThemePreference } from "@/db/settings";
import { applyThemePreference } from "@/constants/theme";
import { setCurrentCurrency } from "@/utils/currency";
import { pickBackup } from "@/utils/dataFiles";
import { formatDisplayDate } from "@/utils/dateHelpers";
import { formatCount } from "@/utils/formatters";
import { syncRemindersQuietly } from "@/utils/reminders";

/**
 * Fait choisir et restaurer une sauvegarde. `onRestored` n'est appelé
 * qu'après une restauration réussie. Lève une UserFacingError si le fichier
 * est refusé ; ne fait rien si l'utilisateur annule.
 */
export async function chooseAndRestore(onRestored: () => void): Promise<void> {
  const backup = await pickBackup();
  if (backup === null) return;
  const current = countTransactions();
  const date = formatDisplayDate(backup.creeLe.slice(0, 10));
  const replaces =
    current === 0
      ? "Elle remplacera les catégories et réglages de ce téléphone."
      : `Elle remplacera tout ce qu'il y a sur ce téléphone (${formatCount(current)}, catégories, budgets et réglages).`;
  Alert.alert("Restaurer cette sauvegarde ?", `Sauvegarde du ${date} : ${formatCount(backup.transactions.length)}.\n\n${replaces}`, [
    { text: "Annuler", style: "cancel" },
    {
      text: "Restaurer",
      style: "destructive",
      onPress: () => {
        try {
          restoreBackup(backup);
        } catch {
          Alert.alert("Restauration impossible", "Rien n'a été modifié : tes données actuelles sont intactes.");
          return;
        }
        applyThemePreference(getThemePreference());
        setCurrentCurrency(getCurrencyCode());
        try {
          applyDueRecurrences();
        } catch {
          // Réessayé au prochain affichage de l'accueil.
        }
        syncRemindersQuietly();
        onRestored();
        const n = backup.transactions.length;
        Alert.alert("Sauvegarde restaurée", `${formatCount(n)} retrouvée${n > 1 ? "s" : ""}.`);
      },
    },
  ]);
}
