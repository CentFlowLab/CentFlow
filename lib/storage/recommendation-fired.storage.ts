import { readUserJson, writeUserJson } from './local-flags';

const SCOPE = 'recommendation-fired';

export type RecommendationFiredRecord = {
  id: string;
  ruleId: string;
  fingerprint: string;
  firedAt: string;
};

export async function readRecommendationFiredRecords(
  userId: string,
): Promise<RecommendationFiredRecord[]> {
  const data = await readUserJson<RecommendationFiredRecord[]>(SCOPE, userId);
  return data ?? [];
}

export async function writeRecommendationFiredRecords(
  userId: string,
  records: RecommendationFiredRecord[],
): Promise<void> {
  const trimmed = records.slice(-80);
  await writeUserJson(SCOPE, userId, trimmed);
}
