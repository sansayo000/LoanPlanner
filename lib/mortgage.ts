export type LoanResult = {
  principal: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  payments: number;
};

const EPSILON = 1e-10;

export function paymentFactor(annualRatePercent: number, years: number): number {
  if (annualRatePercent < 0 || years <= 0) return Number.NaN;
  const payments = years * 12;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (Math.abs(monthlyRate) < EPSILON) return 1 / payments;
  const growth = Math.pow(1 + monthlyRate, payments);
  return (monthlyRate * growth) / (growth - 1);
}

export function calculateLoan(principal: number, annualRatePercent: number, years: number): LoanResult {
  const payments = years * 12;
  if (principal < 0 || annualRatePercent < 0 || years <= 0 || !Number.isFinite(principal + annualRatePercent + years)) {
    return { principal, monthlyPayment: Number.NaN, totalPayment: Number.NaN, totalInterest: Number.NaN, payments };
  }
  const monthlyPayment = principal === 0 ? 0 : principal * paymentFactor(annualRatePercent, years);
  const totalPayment = monthlyPayment * payments;
  return { principal, monthlyPayment, totalPayment, totalInterest: totalPayment - principal, payments };
}

export function requiredDownPaymentForMonthlyTarget(
  propertyPrice: number, targetMonthlyPayment: number, annualRatePercent: number, years: number,
): number {
  const factor = paymentFactor(annualRatePercent, years);
  return propertyPrice - targetMonthlyPayment / factor;
}

export function requiredDownPaymentForTotalTarget(
  propertyPrice: number, targetTotalPayment: number, annualRatePercent: number, years: number,
): number {
  const factor = paymentFactor(annualRatePercent, years) * years * 12;
  return propertyPrice - targetTotalPayment / factor;
}

export function findBreakEvenRate(
  principal: number,
  years: number,
  target: number,
  basis: "monthly" | "total",
  maxRatePercent = 20,
): number | null {
  if (principal < 0 || years <= 0 || target < 0) return null;
  const valueAt = (rate: number) => {
    const loan = calculateLoan(principal, rate, years);
    return basis === "monthly" ? loan.monthlyPayment : loan.totalPayment;
  };
  if (Math.abs(valueAt(0) - target) < 0.005) return 0;
  if (valueAt(0) > target || valueAt(maxRatePercent) < target) return null;
  let low = 0;
  let high = maxRatePercent;
  for (let i = 0; i < 100; i += 1) {
    const mid = (low + high) / 2;
    if (valueAt(mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
