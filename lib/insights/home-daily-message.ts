export type HomeDailyMessageInput = {
  budgetUsedPercent?: number;
  daysToGoal?: number | null;
  monthlySavingsRate?: number;
  cashflowNegative?: boolean;
  primaryGoalLabel?: string;
};

const FALLBACK = 'Continua a registar movimentos para insights personalizados.';

export function getHomeDailyMessage(input: HomeDailyMessageInput): string {
  if (input.budgetUsedPercent != null && input.budgetUsedPercent > 90) {
    return `Atenção — já utilizaste ${Math.round(input.budgetUsedPercent)}% do orçamento.`;
  }
  if (input.daysToGoal != null && input.daysToGoal <= 30 && input.daysToGoal > 0) {
    return `Faltam apenas ${input.daysToGoal} dias para atingires o objetivo!`;
  }
  if (input.monthlySavingsRate != null && input.monthlySavingsRate > 0.2) {
    return `Bom trabalho — já poupaste ${Math.round(input.monthlySavingsRate * 100)}% este mês.`;
  }
  if (input.cashflowNegative) {
    return 'Este mês as despesas estão a superar as receitas.';
  }
  if (input.primaryGoalLabel) {
    return `Foco em ${input.primaryGoalLabel}.`;
  }
  return FALLBACK;
}
