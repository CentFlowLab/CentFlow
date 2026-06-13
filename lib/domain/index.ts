export {
  calculateNetWorth,
  calculateNetWorthChangePercent,
  sumAccountBalances,
  sumCreditLiabilities,
  sumInventoryValue,
  sumRecurringInvestments,
} from './net-worth.service';

export type {
  AnalysisData,
  AnalysisInsight,
  AnalysisMetric,
} from './analysis.types';

export type {
  AiFeatureKey,
  FinancialProfileLevel,
  FinancialProfileResult,
  FinancialProfileSignals,
  ProfileDimension,
  ProfileDimensionId,
} from './financial-profile.types';

export {
  calculateFinancialProfile,
  canAccessAiAssistant,
  getLevelFromScore,
  getPointsToNextLevel,
  isAiFeatureUnlocked,
  PROFILE_DIMENSION_WEIGHTS,
} from './financial-profile.service';

export type {
  Account,
  AssetCategoryBreakdown,
  AssetCategoryKey,
  AttentionItem,
  AttentionPriority,
  AttentionType,
  Credit,
  DashboardData,
  InventoryItem,
  NetWorthInput,
  NetWorthResult,
  RecurringInvestment,
  Suggestion,
} from './types';
