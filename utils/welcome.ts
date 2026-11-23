/**
 * Faut-il montrer les écrans d'accueil ? Connu de toute l'app (comme la
 * devise) : la navigation racine s'y abonne pour afficher l'accueil ou les
 * onglets.
 */
import { useSyncExternalStore } from "react";

let pending = false;
const listeners = new Set<() => void>();

export function setWelcomePending(value: boolean): void {
  if (value === pending) return;
  pending = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const read = () => pending;

export function useWelcomePending(): boolean {
  return useSyncExternalStore(subscribe, read, read);
}

/**
 * Décision au démarrage. Accueil seulement pour une app neuve : une app
 * déjà utilisée (mise à jour) ne le voit jamais, même vidée plus tard.
 */
export function shouldShowWelcome(state: { welcomeDone: boolean; operations: number }): boolean {
  return !state.welcomeDone && state.operations === 0;
}
