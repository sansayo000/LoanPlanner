import { describe, expect, it } from "vitest";
import { calculateLoan, findBreakEvenRate, requiredDownPaymentForMonthlyTarget, requiredDownPaymentForTotalTarget } from "./mortgage";

describe("calculateLoan", () => {
  it("calculates the default current scenario", () => {
    const result = calculateLoan(55_000_000, 1, 35);
    expect(result.monthlyPayment).toBeCloseTo(155_257.1344, 3);
    expect(result.totalPayment).toBeCloseTo(65_207_996.45, 0);
    expect(result.totalInterest).toBeCloseTo(10_207_996.45, 0);
  });
  it("supports a zero interest rate", () => {
    const result = calculateLoan(12_000_000, 0, 10);
    expect(result.monthlyPayment).toBe(100_000);
    expect(result.totalInterest).toBe(0);
  });
  it("rejects invalid terms", () => expect(calculateLoan(10_000_000, 1, 0).monthlyPayment).toBeNaN());
});

describe("reverse calculations", () => {
  const current = calculateLoan(55_000_000, 1, 35);
  it("finds down payments that reproduce each target", () => {
    const monthlyDown = requiredDownPaymentForMonthlyTarget(65_000_000, current.monthlyPayment, 2, 35);
    const totalDown = requiredDownPaymentForTotalTarget(65_000_000, current.totalPayment, 2, 35);
    expect(calculateLoan(65_000_000 - monthlyDown, 2, 35).monthlyPayment).toBeCloseTo(current.monthlyPayment, 6);
    expect(calculateLoan(65_000_000 - totalDown, 2, 35).totalPayment).toBeCloseTo(current.totalPayment, 5);
  });
  it("finds monthly and total break-even rates", () => {
    const monthlyRate = findBreakEvenRate(50_000_000, 35, current.monthlyPayment, "monthly");
    const totalRate = findBreakEvenRate(50_000_000, 35, current.totalPayment, "total");
    expect(calculateLoan(50_000_000, monthlyRate!, 35).monthlyPayment).toBeCloseTo(current.monthlyPayment, 5);
    expect(calculateLoan(50_000_000, totalRate!, 35).totalPayment).toBeCloseTo(current.totalPayment, 4);
  });
});
