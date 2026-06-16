import type { Credit } from '@/lib/domain/types';

export type CreditAnalysis = {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  effectiveAnnualRate: number;
  effectiveMonthlyRate: number;
  debtToIncomeRatio: number | null;
  remainingMonths: number | null;
  warnings: string[];
  insights: string[];
  earlyAmortization: EarlyAmortizationResult | null;
};

export type EarlyAmortizationResult = {
  newBalance: number;
  monthsSaved: number;
  interestSaved: number;
  newRemainingMonths: number;
};

export type CreditAnalysisInput = Pick<
  Credit,
  | 'outstandingBalance'
  | 'originalAmount'
  | 'interestRateAnnual'
  | 'indexRate'
  | 'spread'
  | 'termMonths'
  | 'monthlyPayment'
  | 'insuranceMonthly'
  | 'nextPaymentAmount'
> & {
  monthlyIncome?: number;
  earlyAmortizationAmount?: number;
};

export function resolveEffectiveAnnualRate(input: CreditAnalysisInput): number {
  if (input.interestRateAnnual !== undefined && input.interestRateAnnual > 0) {
    return input.interestRateAnnual;
  }
  if (input.indexRate !== undefined && input.spread !== undefined) {
    return input.indexRate + input.spread;
  }
  return 0;
}

function resolveMonthlyPayment(input: CreditAnalysisInput, annualRate: number): number {
  if (input.monthlyPayment && input.monthlyPayment > 0) return input.monthlyPayment;
  if (input.nextPaymentAmount && input.nextPaymentAmount > 0) return input.nextPaymentAmount;

  const principal = input.outstandingBalance;
  const months = input.termMonths ?? 0;

  if (principal <= 0 || months <= 0) return 0;
  if (annualRate <= 0) return principal / months;

  const monthlyRate = annualRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

function countRemainingMonths(
  balance: number,
  monthlyPayment: number,
  monthlyRate: number,
): number {
  if (balance <= 0) return 0;
  if (monthlyPayment <= 0) return 0;
  if (monthlyRate <= 0) return Math.ceil(balance / monthlyPayment);

  let remaining = balance;
  let months = 0;
  const maxMonths = 600;

  while (remaining > 0.01 && months < maxMonths) {
    const interest = remaining * monthlyRate;
    const principalPart = monthlyPayment - interest;
    if (principalPart <= 0) break;
    remaining -= principalPart;
    months += 1;
  }

  return months;
}

function totalInterestPaid(
  balance: number,
  monthlyPayment: number,
  monthlyRate: number,
): number {
  const months = countRemainingMonths(balance, monthlyPayment, monthlyRate);
  return Math.max(0, monthlyPayment * months - balance);
}

export function simulateEarlyAmortization(
  balance: number,
  monthlyPayment: number,
  annualRatePercent: number,
  extraPayment: number,
): EarlyAmortizationResult | null {
  if (balance <= 0 || extraPayment <= 0 || monthlyPayment <= 0) return null;

  const monthlyRate = annualRatePercent / 100 / 12;
  const baselineMonths = countRemainingMonths(balance, monthlyPayment, monthlyRate);
  const baselineInterest = totalInterestPaid(balance, monthlyPayment, monthlyRate);

  const newBalance = Math.max(0, balance - extraPayment);
  const newRemainingMonths = countRemainingMonths(newBalance, monthlyPayment, monthlyRate);
  const newInterest = totalInterestPaid(newBalance, monthlyPayment, monthlyRate);

  return {
    newBalance,
    monthsSaved: Math.max(0, baselineMonths - newRemainingMonths),
    interestSaved: Math.max(0, baselineInterest - newInterest),
    newRemainingMonths,
  };
}

export function analyzeCredit(input: CreditAnalysisInput): CreditAnalysis {
  const effectiveAnnualRate = resolveEffectiveAnnualRate(input);
  const monthlyPayment = resolveMonthlyPayment(input, effectiveAnnualRate);
  const insurance = input.insuranceMonthly ?? 0;
  const totalMonthly = monthlyPayment + insurance;
  const effectiveMonthlyRate = effectiveAnnualRate / 100 / 12;
  const termMonths = input.termMonths ?? 0;
  const original = input.originalAmount ?? input.outstandingBalance;

  const totalPaid = totalMonthly * termMonths;
  const totalInterest = Math.max(0, totalPaid - original);
  const totalCost = original + totalInterest + insurance * termMonths;

  const warnings: string[] = [];
  const insights: string[] = [];

  if (effectiveAnnualRate > 8) {
    warnings.push('TAEG elevado — considera renegociar ou amortizar antecipadamente.');
  } else if (effectiveAnnualRate > 0 && effectiveAnnualRate <= 4) {
    insights.push('Taxa competitiva face à média do mercado.');
  }

  if (input.indexRate !== undefined && input.spread !== undefined) {
    insights.push(
      `Taxa efectiva estimada: Euribor ${input.indexRate.toFixed(2)}% + spread ${input.spread.toFixed(2)}% = ${effectiveAnnualRate.toFixed(2)}%.`,
    );
  }

  if (input.spread !== undefined && input.spread > 2) {
    warnings.push('Spread acima de 2% — pode valer a pena comparar ofertas.');
  }

  if (monthlyPayment > 0 && input.outstandingBalance > monthlyPayment * 360) {
    warnings.push('Prazo longo — o custo total de juros será significativo.');
  }

  const debtToIncomeRatio =
    input.monthlyIncome && input.monthlyIncome > 0
      ? (totalMonthly / input.monthlyIncome) * 100
      : null;

  if (debtToIncomeRatio !== null) {
    if (debtToIncomeRatio > 35) {
      warnings.push(
        `Prestação representa ${debtToIncomeRatio.toFixed(0)}% do rendimento — acima do limite recomendado (35%).`,
      );
    } else if (debtToIncomeRatio <= 20) {
      insights.push('Taxa de esforço saudável face ao rendimento declarado.');
    }
  }

  const remainingMonths =
    monthlyPayment > 0 && input.outstandingBalance > 0
      ? countRemainingMonths(input.outstandingBalance, monthlyPayment, effectiveMonthlyRate)
      : termMonths > 0
        ? termMonths
        : null;

  if (remainingMonths !== null && remainingMonths > 0 && effectiveMonthlyRate > 0) {
    insights.push(
      `Estimativa de ${remainingMonths} prestações para liquidar o saldo actual.`,
    );
  }

  const earlyAmortization =
    input.earlyAmortizationAmount !== undefined
      ? simulateEarlyAmortization(
          input.outstandingBalance,
          monthlyPayment,
          effectiveAnnualRate,
          input.earlyAmortizationAmount,
        )
      : null;

  if (earlyAmortization && earlyAmortization.monthsSaved > 0) {
    insights.push(
      `Amortização antecipada pouparia ~${earlyAmortization.monthsSaved} meses e juros significativos.`,
    );
  }

  return {
    monthlyPayment,
    totalInterest,
    totalCost,
    effectiveAnnualRate,
    effectiveMonthlyRate,
    debtToIncomeRatio,
    remainingMonths,
    warnings,
    insights,
    earlyAmortization,
  };
}
