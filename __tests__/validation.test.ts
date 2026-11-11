import {
  MAX_AMOUNT,
  parseAmount,
  parseOptionalBudget,
  validateCategoryInput,
  validateTransactionInput,
} from "../utils/validation";

describe("amount parsing", () => {
  it.each([
    ["1500", 1500],
    ["1 500", 1500],
    ["1 500", 1500],
    ["  25 000 ", 25000],
  ])("accepts whole FCFA amount %j", (value, expected) => {
    expect(parseAmount(value)).toBe(expected);
  });

  it.each(["", "0", "-3", "12,5", "1.5", "Infinity", "0x10", "abc", String(MAX_AMOUNT + 1)])(
    "rejects invalid amount %j",
    (value) => {
      expect(parseAmount(value)).toBeNull();
    },
  );
});

describe("transaction validation", () => {
  it("requires category and real ISO date", () => {
    expect(validateTransactionInput("10", null, "2026-10-26").error).toBe("Choisis une catégorie.");
    expect(validateTransactionInput("10", 3, "2026-02-31").error).toBe("Choisis une date valide.");
  });

  it("returns normalized input when valid", () => {
    expect(validateTransactionInput("1 500", 2, "2026-10-26")).toEqual({
      error: null,
      value: { montant: 1500, categorieId: 2, date: "2026-10-26", note: null },
    });
  });
});

describe("budget parsing", () => {
  it("treats an empty field as no budget", () => {
    expect(parseOptionalBudget("  ")).toEqual({ error: null, value: null });
  });

  it("accepts a whole amount and rejects anything else", () => {
    expect(parseOptionalBudget("50 000")).toEqual({ error: null, value: 50000 });
    expect(parseOptionalBudget("0").error).not.toBeNull();
    expect(parseOptionalBudget("12,5").error).not.toBeNull();
  });
});

describe("category validation", () => {
  const base = { type: "depense" as const, couleur: "#E8590C", icone: "🍲", masquee: false, budgetText: "" };

  it("trims and collapses spaces in the name", () => {
    const result = validateCategoryInput({ ...base, nom: "  Petit   déjeuner " });
    expect(result.error).toBeNull();
    if (result.error === null) expect(result.value.nom).toBe("Petit déjeuner");
  });

  it("rejects an empty or too long name", () => {
    expect(validateCategoryInput({ ...base, nom: "   " }).error).toBe("Donne un nom à la catégorie.");
    expect(validateCategoryInput({ ...base, nom: "x".repeat(31) }).error).not.toBeNull();
  });

  it("keeps a budget only for expense categories", () => {
    const expense = validateCategoryInput({ ...base, nom: "Eau", budgetText: "10 000" });
    const income = validateCategoryInput({ ...base, type: "revenu", nom: "Prime", budgetText: "10 000" });
    expect(expense.error === null && expense.value.budget).toBe(10000);
    expect(income.error === null && income.value.budget).toBeNull();
  });
});
