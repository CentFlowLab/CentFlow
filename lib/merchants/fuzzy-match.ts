export type FuzzyMatchCandidate = {
  id: string;
  description?: string | null;
  merchantGroupId?: string | null;
};

export type FuzzyMatchResult = {
  description: string;
  movementId: string;
  similarity: number;
  groupId?: string;
  groupName?: string;
};

/** Normaliza texto para comparação fuzzy. */
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0]![j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  return matrix[a.length]![b.length]!;
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = a.split(' ').filter(Boolean);
  const tokensB = b.split(' ').filter(Boolean);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setB = new Set(tokensB);
  let shared = 0;
  for (const token of tokensA) {
    if (setB.has(token)) shared += 1;
  }

  return shared / Math.max(tokensA.length, tokensB.length);
}

function prefixWordScore(shorter: string, longer: string): number {
  if (longer.startsWith(`${shorter} `)) {
    return Math.min(0.95, shorter.length / longer.length + 0.4);
  }
  return 0;
}

function leadingTokenScore(na: string, nb: string): number {
  const ta = na.split(' ').filter(Boolean)[0] ?? '';
  const tb = nb.split(' ').filter(Boolean)[0] ?? '';
  if (!ta || !tb) return 0;
  if (ta === tb) return na === nb ? 1 : 0.82;
  if (ta.startsWith(tb) || tb.startsWith(ta)) {
    return Math.min(ta.length, tb.length) / Math.max(ta.length, tb.length) * 0.9;
  }
  const maxLen = Math.max(ta.length, tb.length);
  return Math.max(0, 1 - levenshtein(ta, tb) / maxLen) * 0.75;
}

/**
 * Calcula similaridade entre duas strings (0 = nada similar, 1 = idêntico).
 * Combina Levenshtein normalizado, sobreposição de tokens, substring e token inicial.
 */
export function calculateSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const maxLen = Math.max(na.length, nb.length);
  const levSim = 1 - levenshtein(na, nb) / maxLen;
  const tokenSim = tokenOverlap(na, nb);

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;

  let containsSim = 0;
  if (longer.includes(shorter)) {
    containsSim = shorter.length / maxLen + (longer.startsWith(`${shorter} `) ? 0.25 : 0.1);
    containsSim = Math.min(containsSim, 0.98);
  }

  const prefixScore = prefixWordScore(shorter, longer);
  const leadingToken = leadingTokenScore(na, nb);

  const blended =
    0.2 * levSim +
    0.3 * tokenSim +
    0.2 * containsSim +
    0.15 * prefixScore +
    0.15 * leadingToken;

  return Math.max(blended, levSim, tokenSim, containsSim, prefixScore, leadingToken);
}

export const DEFAULT_SIMILARITY_THRESHOLD = 0.65;
export const STRONG_SIMILARITY_THRESHOLD = 0.9;
export const MIN_SINGLE_MATCH_SIMILARITY = 0.8;

/**
 * Encontra movimentos anteriores com descrição similar.
 * Regras anti-falsos-positivos: se só 1 match com similaridade < 0.80, não sugere.
 */
export function findSimilarMovements(
  description: string,
  candidates: FuzzyMatchCandidate[],
  options?: {
    excludeMovementId?: string;
    threshold?: number;
    groupNameById?: Map<string, string>;
  },
): FuzzyMatchResult[] {
  const threshold = options?.threshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const trimmed = description.trim();
  if (!trimmed) return [];

  const results: FuzzyMatchResult[] = [];

  for (const candidate of candidates) {
    if (options?.excludeMovementId && candidate.id === options.excludeMovementId) continue;
    const candidateDesc = candidate.description?.trim();
    if (!candidateDesc) continue;

    const similarity = calculateSimilarity(trimmed, candidateDesc);
    if (similarity < threshold) continue;

    const groupId = candidate.merchantGroupId ?? undefined;
    results.push({
      description: candidateDesc,
      movementId: candidate.id,
      similarity,
      groupId,
      groupName: groupId ? options?.groupNameById?.get(groupId) : undefined,
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);

  if (results.length === 1 && results[0]!.similarity < MIN_SINGLE_MATCH_SIMILARITY) {
    return [];
  }

  return results;
}

/** Nome sugerido para novo grupo — palavra mais curta/comum entre descrições. */
export function suggestGroupName(descriptions: string[]): string {
  const normalized = descriptions.map(normalize).filter(Boolean);
  if (normalized.length === 0) return 'Grupo';

  const byLength = [...normalized].sort((a, b) => a.length - b.length);
  const shortest = byLength[0]!;

  const tokenCounts = new Map<string, number>();
  for (const desc of normalized) {
    for (const token of desc.split(' ').filter(Boolean)) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  }

  let bestToken = shortest;
  let bestScore = -1;
  for (const [token, count] of tokenCounts) {
    const score = count * 10 - token.length;
    if (score > bestScore) {
      bestScore = score;
      bestToken = token;
    }
  }

  const source = descriptions.find((d) => normalize(d) === shortest) ?? descriptions[0]!;
  return source.trim().split(/\s+/)[0] || bestToken;
}
