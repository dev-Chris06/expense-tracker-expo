import { parseAmount, validateExpenseInput } from "../utils/expenseValidation";

describe("expense validation", () => {
  it("accepts a positive amount with comma decimals", () => {
    expect(parseAmount("1250,50")).toBe(1250.5);
  });

  it.each(["", "0", "-3", "1.234", "Infinity", "0x10", "1 000"])("rejects invalid amount %s", (value) => {
    expect(parseAmount(value)).toBeNull();
  });

  it("requires category and real ISO date", () => {
    expect(validateExpenseInput("10", null, "2026-10-26").error).toBe("Choisis une catégorie.");
    expect(validateExpenseInput("10", "Autre", "2026-02-31").error).toBe("Choisis une date valide.");
  });

  it("returns normalized input when valid", () => {
    expect(validateExpenseInput("10,5", "Transport", "2026-10-26")).toEqual({
      error: null,
      value: { montant: 10.5, categorie: "Transport", date: "2026-10-26", note: null },
    });
  });
});
