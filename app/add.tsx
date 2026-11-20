import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import QuickEntry from "@/components/QuickEntry";
import { addRecurrence } from "@/db/recurrences";
import { addTransaction } from "@/db/transactions";
import { budgetAlertsAfterAdd } from "@/utils/budgetAlerts";
import { syncRemindersQuietly } from "@/utils/reminders";

export default function AddScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <QuickEntry
      initialType={type === "revenu" ? "revenu" : "depense"}
      onClose={close}
      allowRepeat
      onSubmit={async (value, category, repeatMonthly) => {
        await addTransaction(value);
        if (repeatMonthly) {
          // Ce mois-ci vient d'être saisi : les suivants seront ajoutés seuls.
          await addRecurrence({
            montant: value.montant,
            categorieId: value.categorieId,
            note: value.note,
            jour: Number(value.date.slice(8)),
            dernierMois: value.date.slice(0, 7),
          });
        }
        // Une opération notée aujourd'hui : pas de rappel ce soir.
        syncRemindersQuietly();
        // Une alerte ratée ne doit pas faire croire que l'ajout a échoué.
        const alerts = await budgetAlertsAfterAdd(value, category).catch(() => []);
        // Retour à l'onglet d'origine, qui se recharge seul.
        close();
        if (alerts.length) Alert.alert("Attention au budget", alerts.join("\n\n"));
      }}
    />
  );
}
