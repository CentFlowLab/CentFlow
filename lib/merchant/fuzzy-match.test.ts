import assert from 'node:assert/strict';
import test from 'node:test';

import {
  levenshteinSimilarity,
  matchMerchantDescription,
  tokenOverlapScore,
} from '@/lib/merchant/fuzzy-match';

test('levenshteinSimilarity — comerciantes similares', () => {
  assert.ok(levenshteinSimilarity('Continente Modelo', 'CONTINENTE MODELO') > 0.9);
  assert.ok(levenshteinSimilarity('Uber Trip', 'UBER BV') > 0.3);
});

test('tokenOverlapScore — palavras partilhadas', () => {
  assert.ok(tokenOverlapScore('Netflix Com', 'Pagamento Netflix') > 0.2);
});

test('matchMerchantDescription — usa merchant_group', () => {
  const match = matchMerchantDescription('COMPRA CONTINENTE MODELO', [
    {
      id: 'g1',
      name: 'Continente',
      aliases: ['continente modelo'],
      category: 'food',
    },
  ]);
  assert.equal(match.merchantGroupId, 'g1');
  assert.equal(match.category, 'food');
});
