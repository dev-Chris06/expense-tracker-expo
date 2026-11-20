/**
 * Devise en cours, connue de toute l'app.
 *
 * Gardée dans une variable de module (comme le thème) pour que les
 * fonctions de formatage restent de simples fonctions synchrones. Les
 * écrans qui affichent des montants s'abonnent avec `useCurrency()` et se
 * redessinent quand la devise change.
 */
import { useSyncExternalStore } from "react";

import { type Currency, DEFAULT_CURRENCY_CODE, findCurrency } from "@/constants/currencies";

let current: Currency = findCurrency(DEFAULT_CURRENCY_CODE);
const listeners = new Set<() => void>();

export function getCurrency(): Currency {
  return current;
}

export function setCurrentCurrency(code: string | null | undefined): void {
  const next = findCurrency(code);
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCurrency(): Currency {
  return useSyncExternalStore(subscribe, getCurrency, getCurrency);
}
