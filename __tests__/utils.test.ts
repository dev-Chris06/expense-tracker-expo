import type { Expense } from "../types/expense";
import { formatDisplayDate, isValidISODate, toISODate } from "../utils/dateHelpers";
import { formatAmount, formatCount } from "../utils/formatters";
import { formatMonthLabel, monthKey, percentOf, shiftMonth } from "../utils/months";
import { matchesQuery, normalizeForSearch } from "../utils/search";

const expense: Expense = { id: 1, montant: 1500, categorie: "Études", date: "2026-08-02", note: "Cahiers Déjà" };

describe("formatters", () => {
  it("formats amounts with non-breaking thousands separators", () => {
    expect(formatAmount(0)).toBe("0 FCFA");
    expect(formatAmount(1500)).toBe("1 500 FCFA");
    expect(formatAmount(1234567)).toBe("1 234 567 FCFA");
  });

  it("pluralizes operation counts", () => {
    expect(formatCount(0)).toBe("0 opération");
    expect(formatCount(1)).toBe("1 opération");
    expect(formatCount(2)).toBe("2 opérations");
  });
});

describe("dates", () => {
  it("formats and validates ISO dates", () => {
    expect(formatDisplayDate("2026-08-02")).toBe("02/08/2026");
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(isValidISODate("2024-02-29")).toBe(true);
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2026-8-2")).toBe(false);
  });
});

describe("months", () => {
  it("builds, shifts and labels month keys", () => {
    expect(monthKey(new Date(2026, 9, 31))).toBe("2026-10");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(formatMonthLabel("2026-08")).toBe("Août 2026");
  });

  it("computes safe percentages", () => {
    expect(percentOf(25, 100)).toBe(25);
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(5, 0)).toBe(0);
  });
});

describe("search", () => {
  it("normalizes accents, case and spaces", () => {
    expect(normalizeForSearch(" Études 1 500 ")).toBe("etudes1500");
  });

  it.each(["", "etudes", "ÉTU", "cahiers deja", "02/08", "2026-08", "1 500", "1500"])("matches %j", (query) => {
    expect(matchesQuery(expense, query)).toBe(true);
  });

  it.each(["transport", "03/08", "2000"])("does not match %j", (query) => {
    expect(matchesQuery(expense, query)).toBe(false);
  });
});
