import assert from 'node:assert/strict';
import test from 'node:test';

import { getAutoEmoji, resolveCategoryEmoji } from '@/lib/categories/emoji-map';

test('getAutoEmoji reconhece tabaco e café', () => {
  assert.equal(getAutoEmoji('Tabaco'), '🚬');
  assert.equal(getAutoEmoji('Café da manhã'), '☕');
});

test('getAutoEmoji devolve null sem keyword', () => {
  assert.equal(getAutoEmoji('Academia'), null);
});

test('resolveCategoryEmoji usa default quando não há sugestão', () => {
  assert.equal(resolveCategoryEmoji('Academia'), '🏷️');
});

test('resolveCategoryEmoji respeita emoji guardado', () => {
  assert.equal(resolveCategoryEmoji('Tabaco', '📦'), '📦');
});
