import { useRouter } from "expo-router";

import ExpenseForm from "@/components/ExpenseForm";
import { addExpense } from "@/db/expenses";

export default function AddScreen() {
  const router = useRouter();
  return (
    <ExpenseForm
      submitLabel="Enregistrer la dépense"
      onSubmit={async (value) => {
        await addExpense(value);
        router.replace("/list");
      }}
    />
  );
}
