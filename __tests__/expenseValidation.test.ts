import { MAX_AMOUNT, parseAmount, validateExpenseInput } from "../utils/expenseValidation";

describe("expense validation", () => {
  it.each([
    ["1500", 1500],
    ["1 500", 1500],
    ["1 500", 1500],
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

  it("requires category and real ISO date", () => {
    expect(validateExpenseInput("10", null, "2026-10-26").error).toBe("Choisis une catégorie.");
    expect(validateExpenseInput("10", "Autre", "2026-02-31").error).toBe("Choisis une date valide.");
  });

  it("returns normalized input when valid", () => {
    expect(validateExpenseInput("1 500", "Transport", "2026-10-26")).toEqual({
      error: null,
      value: { montant: 1500, categorie: "Transport", date: "2026-10-26", note: null },
    });
  });
});
