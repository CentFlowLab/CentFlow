export type FinancialProfileLevel = 1 | 2 | 3;

export type ProfileDimensionId =
  | 'transactions'
  | 'receipts'
  | 'goals'
  | 'assets'
  | 'patrimony';

export type ProfileDimension = {
  id: ProfileDimensionId;
  label: string;
  description: string;
  completed: boolean;
  weight: number;
  maxWeight: number;
  actionHint: string;
};

export type FinancialProfileSignals = {
  transactionCount: number;
  receiptCount: number;
  goalCount: number;
  warrantyCount: number;
  inventoryCount: number;
  hasPatrimonyAccounts: boolean;
  hasPatrimonyInvestments: boolean;
};

export type FinancialProfileResult = {
  score: number;
  level: FinancialProfileLevel;
  levelLabel: string;
  levelTitle: string;
  nextLevel: FinancialProfileLevel | null;
  pointsToNextLevel: number;
  dimensions: ProfileDimension[];
  pendingDimensions: ProfileDimension[];
  unlockedFeatures: string[];
  lockedFeatures: string[];
};

export type AiFeatureKey = 'basic_insights' | 'advanced_metrics' | 'ai_assistant';
