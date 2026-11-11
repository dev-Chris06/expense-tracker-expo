import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import TransactionForm from "@/components/TransactionForm";
import { addTransaction } from "@/db/transactions";
import { budgetAlertsAfterAdd } from "@/utils/budgetAlerts";

export default function AddScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  return (
    <TransactionForm
      initialType={type === "revenu" ? "revenu" : "depense"}
      onSubmit={async (value, category) => {
        await addTransaction(value);
        // Une alerte ratée ne doit pas faire croire que l'ajout a échoué.
        const alerts = await budgetAlertsAfterAdd(value, category).catch(() => []);
        router.replace("/list");
        if (alerts.length) Alert.alert("Attention au budget", alerts.join("\n\n"));
      }}
    />
  );
}
