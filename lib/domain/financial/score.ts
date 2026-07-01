import type { CentFlowScoreResult } from './types';
import { SCORE_DIMENSIONS, buildScoreExplanation } from './score-explain';

export {
  calculateCentFlowScore,
  estimateMonthlyCashflow,
  getFinancialLevel,
  getFinancialLevelProgress,
  monthlySubscriptionTotal,
  FINANCIAL_LEVELS,
} from './centflow-score';

export type { FinancialLevelId } from './centflow-score';

export type TransparentScoreResult = CentFlowScoreResult & {
  explanation: ReturnType<typeof buildScoreExplanation>;
  positiveFactors: string[];
  negativeFactors: string[];
};

export function explainTransparentScore(result: CentFlowScoreResult): TransparentScoreResult {
  const explanation = buildScoreExplanation(result);
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  for (const dimension of SCORE_DIMENSIONS) {
    const earned = result.breakdown[dimension.key];
    const ratio = earned / dimension.maxPoints;
    if (ratio >= 0.7) positiveFactors.push(dimension.earnedLabel);
    else if (ratio < 0.4) negativeFactors.push(dimension.improveLabel);
  }

  return {
    ...result,
    explanation,
    positiveFactors,
    negativeFactors,
  };
}
