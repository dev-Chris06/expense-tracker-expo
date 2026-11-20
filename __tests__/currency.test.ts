import { findCurrency } from "../constants/currencies";
import { BACKUP_APP, parseBackup } from "../utils/backup";
import { budgetSuggestions, roundNice } from "../utils/budget";
import { buildCsv, csvField } from "../utils/csv";
import { getCurrency, setCurrentCurrency } from "../utils/currency";
import { formatAmount, formatMajor, formatNet } from "../utils/formatters";
import { formatDigits, keypadKeys, pressKey, toKeypadText } from "../utils/keypad";
import { dueDates, occurrenceDate, recurrenceLabel, resumeLastMonth } from "../utils/recurrence";
import { parseAmount } from "../utils/validation";
import type { Transaction } from "../types/transaction";

const EUR = findCurrency("EUR");
const XOF = findCurrency("XOF");
const TND = findCurrency("TND");
const nb = (s: string) => s.replace(/ /g, " ");

afterEach(() => setCurrentCurrency("XOF"));

describe("currencies", () => {
  it("defaults to the CFA franc, also for unknown codes", () => {
    expect(getCurrency().code).toBe("XOF");
    expect(findCurrency("???").code).toBe("XOF");
  });

  it("formats amounts stored in the smallest unit", () => {
    expect(formatAmount(150000, XOF)).toBe(nb("150 000 F"));
    expect(formatAmount(1250, EUR)).toBe(nb("12,50 €"));
    expect(formatAmount(1200, EUR)).toBe(nb("12 €"));
    expect(formatAmount(5, EUR)).toBe(nb("0,05 €"));
    expect(formatMajor(1500, TND)).toBe("1,500");
    expect(formatNet(-123456, EUR)).toBe(nb("−1 234,56 €"));
  });

  it("follows the current currency", () => {
    setCurrentCurrency("EUR");
    expect(formatAmount(99)).toBe(nb("0,99 €"));
  });
});

describe("keypad with decimals", () => {
  const type = (keys: string[], decimals: number) =>
    keys.reduce((amount, key) => pressKey(amount, key as Parameters<typeof pressKey>[1], decimals), "");

  it("shows a comma key only for currencies with cents", () => {
    expect(keypadKeys(0)[9]).toBe("000");
    expect(keypadKeys(2)[9]).toBe(",");
  });

  it("types decimal amounts", () => {
    expect(type(["1", "2", ",", "5"], 2)).toBe("12,5");
    expect(type([",", "5"], 2)).toBe("0,5");
    expect(type(["1", ",", ",", "2", "3", "4"], 2)).toBe("1,23");
    expect(type(["1", ",", "000"], 2)).toBe("1,");
    expect(type(["1", ","], 0)).toBe("1");
  });

  it("formats and converts typed text", () => {
    expect(formatDigits("12345,5")).toBe(nb("12 345,5"));
    expect(toKeypadText(1250, 2)).toBe("12,50");
    expect(toKeypadText(1200, 2)).toBe("12");
    expect(toKeypadText(1500, 0)).toBe("1500");
  });

  it("parses typed text into the smallest unit", () => {
    expect(parseAmount("12,5", 2)).toBe(1250);
    expect(parseAmount("12.05", 2)).toBe(1205);
    expect(parseAmount("12,", 2)).toBe(1200);
    expect(parseAmount("1 500", 0)).toBe(1500);
    expect(parseAmount("12,5", 0)).toBeNull();
    expect(parseAmount("1,234", 2)).toBeNull();
    expect(parseAmount("0,00", 2)).toBeNull();
  });
});

describe("recurrence calendar", () => {
  it("clamps the day to short months", () => {
    expect(occurrenceDate("2026-02", 31)).toBe("2026-02-28");
    expect(occurrenceDate("2028-02", 30)).toBe("2028-02-29");
    expect(occurrenceDate("2026-11", 5)).toBe("2026-11-05");
  });

  it("lists the months whose day has come", () => {
    expect(dueDates("2026-11", 5, "2026-11-20")).toEqual([]);
    expect(dueDates("2026-10", 25, "2026-11-20")).toEqual([]);
    expect(dueDates("2026-10", 20, "2026-11-20")).toEqual(["2026-11-20"]);
    expect(dueDates("2026-08", 5, "2026-11-04")).toEqual(["2026-09-05", "2026-10-05"]);
    expect(dueDates("2025-12", 1, "2026-01-01")).toEqual(["2026-01-01"]);
  });

  it("caps the catch-up after a long time away", () => {
    expect(dueDates("2000-01", 1, "2026-11-20")).toHaveLength(24);
  });

  it("does not catch up paused months on resume", () => {
    expect(resumeLastMonth(5, "2026-11-20")).toBe("2026-11");
    expect(resumeLastMonth(25, "2026-11-20")).toBe("2026-10");
  });

  it("labels the day", () => {
    expect(recurrenceLabel(1)).toBe("Le 1er de chaque mois");
    expect(recurrenceLabel(15)).toBe("Le 15 de chaque mois");
  });
});

describe("budget suggestions", () => {
  it("rounds to two significant digits", () => {
    expect(roundNice(57_500, 0)).toBe(58_000);
    expect(roundNice(5_750, 0)).toBe(5_800);
    expect(roundNice(123_456, 2)).toBe(120_000);
  });

  it("proposes less, same and more than usual", () => {
    expect(budgetSuggestions([50_000, 60_000, 0], 0)).toEqual([44_000, 55_000, 66_000]);
    expect(budgetSuggestions([], 0)).toEqual([]);
    expect(budgetSuggestions([0, 0], 0)).toEqual([]);
  });
});

describe("CSV export", () => {
  const t = (over: Partial<Transaction>): Transaction => ({
    id: 1,
    montant: 1500,
    categorieId: 1,
    date: "2026-11-20",
    note: null,
    categorie: "Nourriture",
    type: "depense",
    couleur: "#000",
    icone: "x",
    ...over,
  });

  it("quotes fields that need it", () => {
    expect(csvField("simple")).toBe("simple");
    expect(csvField('a;b "c"')).toBe('"a;b ""c"""');
  });

  it("writes a French-Excel friendly file with signed amounts", () => {
    const csv = buildCsv([t({}), t({ type: "revenu", montant: 5000, categorie: "Parents", note: "pour le mois\nmerci" })], XOF);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Date;Type;Catégorie;Montant (XOF);Note",
      "20/11/2026;Dépense;Nourriture;-1500;",
      '20/11/2026;Revenu;Parents;5000;"pour le mois\nmerci"',
      "",
    ]);
    expect(buildCsv([t({ montant: 1205 })], EUR)).toContain(";-12,05;");
  });
});

describe("backup validation", () => {
  const valid = {
    app: BACKUP_APP,
    format: 1,
    creeLe: "2026-11-20T10:00:00.000Z",
    categories: [{ id: 1, nom: "Nourriture", type: "depense", couleur: "#E8590C", icone: "restaurant-outline", masquee: 0, position: 1, budget: null }],
    transactions: [{ id: 1, montant: 1500, categorie_id: 1, date: "2026-11-20", note: null }],
    recurrences: [{ id: 1, montant: 500, categorie_id: 1, note: "x", jour: 5, dernier_mois: "2026-11", active: 1 }],
    settings: [{ cle: "theme", valeur: "dark" }],
  };
  const withChange = (change: (b: typeof valid) => void) => {
    const copy = JSON.parse(JSON.stringify(valid));
    change(copy);
    return JSON.stringify(copy);
  };

  it("accepts a valid backup", () => {
    expect(parseBackup(JSON.stringify(valid)).error).toBeNull();
  });

  it.each([
    ["not JSON", "{oops"],
    ["another app", withChange((b) => ((b as { app: string }).app = "autre"))],
    ["negative amount", withChange((b) => (b.transactions[0].montant = -5))],
    ["decimal amount", withChange((b) => (b.transactions[0].montant = 1.5))],
    ["invalid date", withChange((b) => (b.transactions[0].date = "2026-02-31"))],
    ["unknown category", withChange((b) => (b.transactions[0].categorie_id = 7))],
    ["duplicate id", withChange((b) => b.transactions.push({ ...b.transactions[0] }))],
    ["bad recurrence day", withChange((b) => (b.recurrences[0].jour = 32))],
    ["missing list", withChange((b) => delete (b as Partial<typeof valid>).settings)],
  ])("rejects %s", (_, text) => {
    expect(parseBackup(text).error).not.toBeNull();
  });

  it("asks to update the app for a newer format", () => {
    expect(parseBackup(withChange((b) => ((b as { format: number }).format = 2))).error).toMatch(/mets l'app à jour/i);
  });
});
