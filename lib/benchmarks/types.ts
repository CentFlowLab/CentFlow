export type SpendingBenchmark = {
  incomeBucketKey: string;
  incomeBucketLabel: string;
  category: string;
  region: string;
  meanAmount: number;
  medianAmount: number;
  sampleCount: number;
  periodMonthKey: string;
  computedAt: string;
};

export type CategoryBenchmarkComparison = {
  category: string;
  categoryLabel: string;
  userAmount: number;
  peerMedianAmount: number;
  peerMeanAmount: number;
  sampleCount: number;
  message: string;
};
