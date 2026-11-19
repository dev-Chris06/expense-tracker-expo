import type { Transaction } from "../types/transaction";
import { formatNet, formatShort } from "../utils/formatters";
import { dayLabel, formatShortDate, groupByDay, nextSortOrder, sortTransactions } from "../utils/grouping";
import { formatDigits, pressKey } from "../utils/keypad";
import { changePercent, daysForAverage, formatShortMonth, greeting, lastMonths } from "../utils/months";

const tx = (id: number, date: string, montant: number, type: "depense" | "revenu" = "depense"): Transaction => ({
  id,
  montant,
  categorieId: 1,
  categorie: "Nourriture",
  type,
  couleur: "#E8590C",
  icone: "restaurant-outline",
  date,
  note: null,
});

describe("keypad", () => {
  it("builds an amount digit by digit", () => {
    let amount = "";
    for (const key of ["1", "5", "000"] as const) amount = pressKey(amount, key);
    expect(amount).toBe("15000");
    expect(pressKey(amount, "back")).toBe("1500");
    expect(pressKey("", "back")).toBe("");
  });

  it("refuses leading zeros and amounts above the maximum", () => {
    expect(pressKey("", "0")).toBe("");
    expect(pressKey("", "000")).toBe("");
    expect(pressKey("999999999", "9")).toBe("999999999");
    expect(pressKey("9999999", "000")).toBe("9999999");
  });

  it("formats the amount being typed", () => {
    expect(formatDigits("")).toBe("0");
    expect(formatDigits("1500")).toBe("1 500");
    expect(formatDigits("1234567")).toBe("1 234 567");
  });
});

describe("short formats", () => {
  it("formats screen amounts", () => {
    expect(formatShort(1500)).toBe("1 500 F");
    expect(formatShort(-3000)).toBe("3 000 F");
    expect(formatNet(42500)).toBe("+42 500 F");
    expect(formatNet(-3000)).toBe("−3 000 F");
    expect(formatNet(0)).toBe("0 F");
  });
});

describe("grouping", () => {
  const rows = [tx(1, "2026-11-17", 1000), tx(2, "2026-11-19", 500), tx(3, "2026-11-19", 25000, "revenu"), tx(4, "2026-11-18", 7000)];

  it("sorts by date, then by entry order, or by amount", () => {
    expect(sortTransactions(rows, "recent").map((t) => t.id)).toEqual([3, 2, 4, 1]);
    expect(sortTransactions(rows, "oldest").map((t) => t.id)).toEqual([1, 4, 2, 3]);
    expect(sortTransactions(rows, "amount").map((t) => t.id)).toEqual([3, 4, 1, 2]);
    expect(nextSortOrder("recent")).toBe("oldest");
    expect(nextSortOrder("amount")).toBe("recent");
  });

  it("groups by day with the net total of each day", () => {
    const sections = groupByDay(sortTransactions(rows, "recent"));
    expect(sections.map((s) => [s.date, s.total, s.data.length])).toEqual([
      ["2026-11-19", 24500, 2],
      ["2026-11-18", -7000, 1],
      ["2026-11-17", -1000, 1],
    ]);
  });

  it("labels days relative to today", () => {
    expect(dayLabel("2026-11-19", "2026-11-19")).toBe("Aujourd’hui · jeu. 19 nov.");
    expect(dayLabel("2026-11-18", "2026-11-19")).toBe("Hier · mer. 18 nov.");
    expect(dayLabel("2026-11-17", "2026-11-19")).toBe("Mar. 17 nov.");
    expect(dayLabel("2026-12-31", "2027-01-01")).toBe("Hier · jeu. 31 déc. 2026");
    expect(formatShortDate("2025-03-01", "2026-11-19")).toBe("sam. 1 mars 2025");
  });
});

describe("months", () => {
  it("lists the last months, oldest first", () => {
    expect(lastMonths("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(formatShortMonth("2026-07")).toBe("Juil.");
    expect(formatShortMonth("2026-05")).toBe("Mai");
  });

  it("counts the days used for the daily average", () => {
    const today = new Date(2026, 10, 19);
    expect(daysForAverage("2026-11", today)).toBe(19);
    expect(daysForAverage("2026-02", today)).toBe(28);
    expect(daysForAverage("2026-12", today)).toBe(0);
  });

  it("computes the change from the previous month", () => {
    expect(changePercent(108, 100)).toBe(8);
    expect(changePercent(50, 100)).toBe(-50);
    expect(changePercent(100, 0)).toBeNull();
  });

  it("greets according to the hour", () => {
    expect(greeting(new Date(2026, 10, 19, 9))).toBe("Bonjour");
    expect(greeting(new Date(2026, 10, 19, 20))).toBe("Bonsoir");
  });
});
