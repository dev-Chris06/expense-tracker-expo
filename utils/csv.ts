/**
 * Export CSV des opérations, pour Excel, Google Sheets ou LibreOffice.
 *
 * Réglages choisis pour qu'un double-clic l'ouvre correctement dans un
 * Excel en français : séparateur « ; », virgule décimale, date JJ/MM/AAAA,
 * BOM UTF-8 (sinon les accents s'affichent mal) et fins de ligne CRLF.
 * Les dépenses sont négatives : une simple somme de la colonne donne le solde.
 */
import type { Currency } from "@/constants/currencies";
import type { Transaction } from "@/types/transaction";
import { formatDisplayDate } from "@/utils/dateHelpers";

/** Met un champ entre guillemets s'il contient ; " ou un retour à la ligne. */
export function csvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Montant signé sans séparateur de milliers : -1250 → "-12,50" en euros. */
export function csvAmount(amount: number, currency: Currency): string {
  const factor = 10 ** currency.decimales;
  const sign = amount < 0 ? "-" : "";
  const minor = Math.abs(amount);
  const whole = Math.floor(minor / factor);
  return currency.decimales === 0
    ? `${sign}${whole}`
    : `${sign}${whole},${String(minor % factor).padStart(currency.decimales, "0")}`;
}

export function buildCsv(transactions: readonly Transaction[], currency: Currency): string {
  const header = ["Date", "Type", "Catégorie", `Montant (${currency.code})`, "Note"];
  const rows = transactions.map((t) => [
    formatDisplayDate(t.date),
    t.type === "revenu" ? "Revenu" : "Dépense",
    t.categorie,
    csvAmount(t.type === "revenu" ? t.montant : -t.montant, currency),
    t.note ?? "",
  ]);
  return `﻿${[header, ...rows].map((row) => row.map(csvField).join(";")).join("\r\n")}\r\n`;
}

/** Nom du fichier : depenses-perso-operations-2026-11-20.csv */
export function csvFileName(today: string): string {
  return `depenses-perso-operations-${today}.csv`;
}
