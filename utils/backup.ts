/**
 * Format du fichier de sauvegarde (JSON) et sa vérification.
 *
 * Une restauration remplace toutes les données : le fichier est donc
 * entièrement vérifié AVANT de toucher à la base. Le moindre doute
 * (champ manquant, montant négatif, catégorie inconnue…) refuse le fichier.
 */
import { isValidISODate } from "@/utils/dateHelpers";

export const BACKUP_APP = "depenses-perso";
export const BACKUP_FORMAT = 1;

export interface BackupCategory {
  id: number;
  nom: string;
  type: "depense" | "revenu";
  couleur: string;
  icone: string;
  masquee: 0 | 1;
  position: number;
  budget: number | null;
}

export interface BackupTransaction {
  id: number;
  montant: number;
  categorie_id: number;
  date: string;
  note: string | null;
}

export interface BackupRecurrence {
  id: number;
  montant: number;
  categorie_id: number;
  note: string | null;
  jour: number;
  dernier_mois: string;
  active: 0 | 1;
}

export interface BackupSetting {
  cle: string;
  valeur: string;
}

export interface Backup {
  app: typeof BACKUP_APP;
  format: typeof BACKUP_FORMAT;
  /** Date et heure de la sauvegarde (ISO) */
  creeLe: string;
  categories: BackupCategory[];
  transactions: BackupTransaction[];
  recurrences: BackupRecurrence[];
  settings: BackupSetting[];
}

type Result = { error: string } | { error: null; value: Backup };

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isPositiveInt = (v: unknown): v is number => isInt(v) && v > 0;
const isText = (v: unknown): v is string => typeof v === "string";
const isNullableText = (v: unknown): v is string | null => v === null || isText(v);
const isFlag = (v: unknown): v is 0 | 1 => v === 0 || v === 1;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function category(v: unknown): v is BackupCategory {
  return (
    isRecord(v) &&
    isPositiveInt(v.id) &&
    isText(v.nom) &&
    v.nom.trim() !== "" &&
    (v.type === "depense" || v.type === "revenu") &&
    isText(v.couleur) &&
    isText(v.icone) &&
    isFlag(v.masquee) &&
    isInt(v.position) &&
    (v.budget === null || isPositiveInt(v.budget))
  );
}

function transaction(v: unknown): v is BackupTransaction {
  return (
    isRecord(v) &&
    isPositiveInt(v.id) &&
    isPositiveInt(v.montant) &&
    isPositiveInt(v.categorie_id) &&
    isText(v.date) &&
    isValidISODate(v.date) &&
    isNullableText(v.note)
  );
}

function recurrence(v: unknown): v is BackupRecurrence {
  return (
    isRecord(v) &&
    isPositiveInt(v.id) &&
    isPositiveInt(v.montant) &&
    isPositiveInt(v.categorie_id) &&
    isNullableText(v.note) &&
    isInt(v.jour) &&
    v.jour >= 1 &&
    v.jour <= 31 &&
    isText(v.dernier_mois) &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(v.dernier_mois) &&
    isFlag(v.active)
  );
}

function setting(v: unknown): v is BackupSetting {
  return isRecord(v) && isText(v.cle) && isText(v.valeur);
}

/** Vérifie le contenu d'un fichier de sauvegarde. */
export function parseBackup(text: string): Result {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "Ce fichier n'est pas une sauvegarde de Dépenses Perso." };
  }
  if (!isRecord(data) || data.app !== BACKUP_APP) {
    return { error: "Ce fichier n'est pas une sauvegarde de Dépenses Perso." };
  }
  if (data.format !== BACKUP_FORMAT) {
    return { error: "Cette sauvegarde vient d'une version plus récente de l'app. Mets l'app à jour puis réessaie." };
  }
  const { categories, transactions, recurrences, settings, creeLe } = data;
  const damaged = { error: "Cette sauvegarde est abîmée : rien n'a été modifié." };
  if (
    !isText(creeLe) ||
    !Array.isArray(categories) ||
    !Array.isArray(transactions) ||
    !Array.isArray(recurrences) ||
    !Array.isArray(settings) ||
    !categories.every(category) ||
    !transactions.every(transaction) ||
    !recurrences.every(recurrence) ||
    !settings.every(setting)
  ) {
    return damaged;
  }

  // Pas de doublon, et chaque opération pointe vers une catégorie présente.
  const categoryIds = new Set(categories.map((c) => c.id));
  const unique = (rows: { id: number }[]) => new Set(rows.map((r) => r.id)).size === rows.length;
  if (
    categoryIds.size !== categories.length ||
    !unique(transactions) ||
    !unique(recurrences) ||
    new Set(settings.map((s) => s.cle)).size !== settings.length ||
    !transactions.every((t) => categoryIds.has(t.categorie_id)) ||
    !recurrences.every((r) => categoryIds.has(r.categorie_id))
  ) {
    return damaged;
  }

  return {
    error: null,
    value: { app: BACKUP_APP, format: BACKUP_FORMAT, creeLe, categories, transactions, recurrences, settings },
  };
}

/** Nom du fichier : depenses-perso-sauvegarde-2026-11-20.json */
export function backupFileName(today: string): string {
  return `${BACKUP_APP}-sauvegarde-${today}.json`;
}
