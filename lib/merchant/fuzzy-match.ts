/**
 * Matching fuzzy de comerciantes — Levenshtein + token overlap.
 * Manter em sync com supabase/functions/_shared/merchant-matching.ts
 */

export type MerchantGroupRecord = {
  id: string;
  name: string;
  aliases: string[];
  category?: string | null;
};

export type MerchantMatchResult = {
  merchantGroupId: string;
  category: string;
  merchantName: string;
  score: number;
};

const MATCH_THRESHOLD = 0.62;

export function normalizeMerchantLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

export function levenshteinSimilarity(a: string, b: string): number {
  const left = normalizeMerchantLabel(a);
  const right = normalizeMerchantLabel(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const maxLen = Math.max(left.length, right.length);
  if (maxLen === 0) return 0;
  return 1 - levenshteinDistance(left, right) / maxLen;
}

export function tokenOverlapScore(a: string, b: string): number {
  const tokensA = new Set(normalizeMerchantLabel(a).split(' ').filter((t) => t.length > 2));
  const tokensB = new Set(normalizeMerchantLabel(b).split(' ').filter((t) => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? overlap / union : 0;
}

export function scoreMerchantMatch(description: string, candidate: string): number {
  const levenshtein = levenshteinSimilarity(description, candidate);
  const tokens = tokenOverlapScore(description, candidate);
  return levenshtein * 0.55 + tokens * 0.45;
}

export function inferCategoryFromMerchantText(merchant?: string): string {
  if (!merchant) return 'other';
  const m = merchant.toLowerCase();
  if (/continente|pingo|auchan|lidl|aldi|minipre[cç]o|intermarche|mercado|el corte/.test(m)) {
    return 'food';
  }
  if (/galp|bp|repsol|prio|uber|bolt|cp|metro|fertagus/.test(m)) return 'transport';
  if (/worten|mediamarkt|fnac|pccomponentes|apple|samsung|staples/.test(m)) return 'shopping';
  if (/ikea|leroy|aki|bricomarch/.test(m)) return 'housing';
  if (/netflix|spotify|disney|hbo|prime video|nos|meo|vodafone|nowo/.test(m)) return 'streaming';
  if (/restaurante|restaurant|mcdonald|burger|pizza|sushi|caf[eé]/.test(m)) return 'restaurant';
  return 'other';
}

/** Encontra o melhor merchant_group ou infere categoria por heurística PT. */
export function matchMerchantDescription(
  description: string,
  groups: MerchantGroupRecord[],
): MerchantMatchResult {
  const normalizedDescription = normalizeMerchantLabel(description);
  let best: MerchantMatchResult | null = null;

  for (const group of groups) {
    const candidates = [group.name, ...group.aliases];
    for (const candidate of candidates) {
      const score = scoreMerchantMatch(normalizedDescription, candidate);
      if (score < MATCH_THRESHOLD) continue;
      if (!best || score > best.score) {
        best = {
          merchantGroupId: group.id,
          category: group.category ?? inferCategoryFromMerchantText(group.name),
          merchantName: group.name,
          score,
        };
      }
    }
  }

  if (best) return best;

  return {
    merchantGroupId: '',
    category: inferCategoryFromMerchantText(description),
    merchantName: description.trim().slice(0, 80) || 'Movimento bancário',
    score: 0,
  };
}
