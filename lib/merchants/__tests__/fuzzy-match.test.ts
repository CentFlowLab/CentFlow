import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculateSimilarity,
  findSimilarMovements,
  normalize,
  suggestGroupName,
} from '@/lib/merchants/fuzzy-match';

describe('normalize', () => {
  it('remove acentos e pontuação', () => {
    assert.equal(normalize('Café!'), 'cafe');
  });
});

describe('calculateSimilarity', () => {
  it('café vs cafe >= 0.90', () => {
    assert.ok(calculateSimilarity('café', 'cafe') >= 0.9);
  });

  it('café vs Café Delta >= 0.65', () => {
    assert.ok(calculateSimilarity('café', 'Café Delta') >= 0.65);
  });

  it('café vs café bica >= 0.70', () => {
    assert.ok(calculateSimilarity('café', 'café bica') >= 0.7);
  });

  it('café vs supermercado < 0.40', () => {
    assert.ok(calculateSimilarity('café', 'supermercado') < 0.4);
  });

  it('BP vs BP Cascais >= 0.70', () => {
    assert.ok(calculateSimilarity('BP', 'BP Cascais') >= 0.7);
  });

  it('Hankook vs Hankook Ventus >= 0.75', () => {
    assert.ok(calculateSimilarity('Hankook', 'Hankook Ventus') >= 0.75);
  });

  it('Netflix vs Spotify < 0.30', () => {
    assert.ok(calculateSimilarity('Netflix', 'Spotify') < 0.3);
  });

  it('Tabaco Marlboro vs Tabaco Iqos >= 0.60', () => {
    assert.ok(calculateSimilarity('Tabaco Marlboro', 'Tabaco Iqos') >= 0.6);
  });

  it('strings vazias retornam 0', () => {
    assert.equal(calculateSimilarity('', 'café'), 0);
    assert.equal(calculateSimilarity('café', ''), 0);
  });
});

describe('findSimilarMovements', () => {
  const candidates = [
    { id: '1', description: 'café', merchantGroupId: null },
    { id: '2', description: 'café bica', merchantGroupId: null },
    { id: '3', description: 'supermercado', merchantGroupId: null },
  ];

  it('encontra similares acima do threshold', () => {
    const matches = findSimilarMovements('Café Delta', candidates, { excludeMovementId: '9' });
    assert.ok(matches.length >= 2);
  });

  it('ignora movimento excluído', () => {
    const matches = findSimilarMovements('café', candidates, { excludeMovementId: '1' });
    assert.ok(!matches.some((m) => m.movementId === '1'));
  });

  it('não sugere com um único match fraco', () => {
    const weak = [{ id: '1', description: 'cafeteria nova', merchantGroupId: null }];
    const matches = findSimilarMovements('café', weak);
    assert.equal(matches.length, 0);
  });
});

describe('suggestGroupName', () => {
  it('prefere token comum curto', () => {
    const name = suggestGroupName(['Café Delta', 'café', 'café bica']);
    assert.ok(/caf/i.test(name));
  });
});
