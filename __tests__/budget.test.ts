import { budgetLevel, budgetPercent, crossedLevel } from "../utils/budget";

describe("budget levels", () => {
  it("warns from 80 % and flags 100 % as over", () => {
    expect(budgetLevel(79_999, 100_000)).toBe("ok");
    expect(budgetLevel(80_000, 100_000)).toBe("warning");
    expect(budgetLevel(100_000, 100_000)).toBe("over");
    expect(budgetLevel(150_000, 100_000)).toBe("over");
  });

  it("reports a level only when a threshold is crossed", () => {
    expect(crossedLevel(70_000, 85_000, 100_000)).toBe("warning");
    expect(crossedLevel(85_000, 90_000, 100_000)).toBeNull();
    expect(crossedLevel(90_000, 101_000, 100_000)).toBe("over");
    expect(crossedLevel(50_000, 120_000, 100_000)).toBe("over");
    expect(crossedLevel(120_000, 130_000, 100_000)).toBeNull();
    expect(crossedLevel(10_000, 20_000, 100_000)).toBeNull();
  });

  it("rounds the used percentage down", () => {
    expect(budgetPercent(84_999, 100_000)).toBe(84);
    expect(budgetPercent(150_000, 100_000)).toBe(150);
  });
});
