/**
 * Demande confirmation avant de supprimer une opération (liste : appui
 * long ; modification : bouton corbeille).
 */
import { Alert, Platform } from "react-native";

import type { Transaction } from "@/types/transaction";
import { formatDisplayDate } from "@/utils/dateHelpers";
import { formatAmount } from "@/utils/formatters";

export function confirmDeleteTransaction(t: Transaction, onConfirm: () => void): void {
  const what = t.type === "depense" ? "la dépense" : "le revenu";
  const message = `${t.note?.trim() || t.categorie} · ${formatAmount(t.montant)} du ${formatDisplayDate(t.date)}`;
  if (Platform.OS === "web") {
    if (globalThis.confirm(`Supprimer ${what} ?\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(`Supprimer ${what} ?`, `${message}\nCette action est définitive.`, [
    { text: "Annuler", style: "cancel" },
    { text: "Supprimer", style: "destructive", onPress: onConfirm },
  ]);
}
