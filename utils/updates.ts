/**
 * Recherche de mise à jour, sur le modèle de Loady.
 *
 * Chaque release GitHub (tag v*) publie un version.json à côté de l'APK.
 * L'app le lit via l'URL « latest » (un simple fichier statique, pas l'API
 * GitHub limitée à 60 requêtes/heure), compare avec la version installée,
 * puis ouvre l'APK dans le navigateur : l'app ne l'installe jamais elle-même.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

const REPO = "https://github.com/dev-Chris06/expense-tracker-expo";
const VERSION_URL = `${REPO}/releases/latest/download/version.json`;
const TIMEOUT_MS = 15_000;

export type UpdateCheckResult =
  | { outcome: "available"; version: string }
  | { outcome: "upToDate" | "failed" | "unsupported" };

/** Version installée, issue de app.json au moment du build. */
export function installedVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

/** Lien direct vers l'APK d'une version publiée. */
export function apkDownloadUrl(version: string): string {
  return `${REPO}/releases/download/v${version}/depenses-expo-${version}.apk`;
}

function parseVersion(value: string): number[] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:\+\d+)?$/.exec(value.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/**
 * Vrai si `candidate` est strictement plus récente que `installed`
 * (major.minor.patch). Une valeur illisible n'est jamais considérée plus récente.
 */
export function isNewerVersion(candidate: string, installed: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(installed);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

async function fetchLatestVersion(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(VERSION_URL, {
      signal: controller.signal,
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const version = (data as { version?: unknown } | null)?.version;
    return typeof version === "string" && parseVersion(version) ? version : null;
  } finally {
    clearTimeout(timer);
  }
}

/** Compare la dernière release publiée avec la version installée. */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  // Les APK n'existent que pour Android.
  if (Platform.OS !== "android") return { outcome: "unsupported" };
  const installed = installedVersion();
  if (!installed) return { outcome: "failed" };
  try {
    const latest = await fetchLatestVersion();
    if (!latest) return { outcome: "failed" };
    return isNewerVersion(latest, installed) ? { outcome: "available", version: latest } : { outcome: "upToDate" };
  } catch {
    // Hors ligne ou réponse illisible : la vérification ne doit jamais gêner l'app.
    return { outcome: "failed" };
  }
}
