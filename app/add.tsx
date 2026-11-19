import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import QuickEntry from "@/components/QuickEntry";
import { addTransaction } from "@/db/transactions";
import { budgetAlertsAfterAdd } from "@/utils/budgetAlerts";

export default function AddScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <QuickEntry
      initialType={type === "revenu" ? "revenu" : "depense"}
      onClose={close}
      onSubmit={async (value, category) => {
        await addTransaction(value);
        // Une alerte ratée ne doit pas faire croire que l'ajout a échoué.
        const alerts = await budgetAlertsAfterAdd(value, category).catch(() => []);
        // Retour à l'onglet d'origine, qui se recharge seul.
        close();
        if (alerts.length) Alert.alert("Attention au budget", alerts.join("\n\n"));
      }}
    />
  );
}
