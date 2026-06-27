/**
 * Motor do plano de onboarding — puro e determinístico.
 *
 * Dado um objetivo de poupança, um prazo (meses) e o rendimento mensal,
 * calcula quanto reservar por mês, quanto fica livre e a viabilidade.
 *
 * NUNCA misturar com património líquido — isto é uma simulação de orçamento
 * para o resultado personalizado do onboarding (ecrã "Resultado personalizado").
 */

export type OnboardingPlanWarning = 'NO_INCOME' | 'EXCEEDS_INCOME' | 'AGGRESSIVE' | 'COMFORTABLE';

export type OnboardingPlanInput = {
  /** Objetivo total a poupar (€). */
  savingsGoal: number;
  /** Prazo em meses (>= 1). */
  months: number;
  /** Rendimento mensal líquido (€). 0 ou indefinido = desconhecido. */
  monthlyIncome?: number;
};

export type OnboardingPlanResult = {
  /** Quanto reservar por mês para atingir o objetivo (€, arredondado). */
  monthlySaving: number;
  /** Rendimento que sobra por mês depois de reservar (€). null se sem rendimento. */
  freePerMonth: number | null;
  /** Percentagem do rendimento que o esforço representa (0–1). null se sem rendimento. */
  effortRatio: number | null;
  /** O plano cabe no rendimento com folga razoável. */
  feasible: boolean;
  warnings: OnboardingPlanWarning[];
};

/** Esforço acima deste rácio é considerado agressivo. */
const AGGRESSIVE_EFFORT = 0.4;
/** Esforço abaixo deste rácio é confortável. */
const COMFORTABLE_EFFORT = 0.2;

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateOnboardingPlan(input: OnboardingPlanInput): OnboardingPlanResult {
  const goal = Number.isFinite(input.savingsGoal) ? Math.max(0, input.savingsGoal) : 0;
  const months = Number.isFinite(input.months) ? Math.max(1, Math.round(input.months)) : 1;
  const income =
    Number.isFinite(input.monthlyIncome) && (input.monthlyIncome ?? 0) > 0
      ? (input.monthlyIncome as number)
      : 0;

  const monthlySaving = roundCurrency(goal / months);

  if (income <= 0) {
    return {
      monthlySaving,
      freePerMonth: null,
      effortRatio: null,
      feasible: true,
      warnings: ['NO_INCOME'],
    };
  }

  const freePerMonth = roundCurrency(income - monthlySaving);
  const effortRatio = monthlySaving / income;
  const warnings: OnboardingPlanWarning[] = [];

  if (monthlySaving > income) {
    warnings.push('EXCEEDS_INCOME');
  } else if (effortRatio > AGGRESSIVE_EFFORT) {
    warnings.push('AGGRESSIVE');
  } else if (effortRatio <= COMFORTABLE_EFFORT) {
    warnings.push('COMFORTABLE');
  }

  return {
    monthlySaving,
    freePerMonth,
    effortRatio,
    feasible: monthlySaving <= income,
    warnings,
  };
}

/** Sugere um prazo (meses) confortável para um objetivo dado o rendimento. */
export function suggestComfortableMonths(savingsGoal: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0 || savingsGoal <= 0) return 12;
  const comfortableMonthly = monthlyIncome * COMFORTABLE_EFFORT;
  if (comfortableMonthly <= 0) return 12;
  return Math.max(1, Math.ceil(savingsGoal / comfortableMonthly));
}
