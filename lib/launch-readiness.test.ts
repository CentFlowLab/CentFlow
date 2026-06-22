import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_OCR_UNAVAILABLE_MESSAGE, resolveOcrUserMessage } from '@/lib/receipt/ocr-messages';
import {
  getContextualQuickAddActions,
  getQuickAddContextLabel,
} from '@/lib/navigation/quick-add-context';

test('OCR failure message is user-friendly, not technical', () => {
  assert.match(DEFAULT_OCR_UNAVAILABLE_MESSAGE, /Não conseguimos ler este talão/);
  assert.doesNotMatch(DEFAULT_OCR_UNAVAILABLE_MESSAGE, /indisponível|stack|error/i);
});

test('resolveOcrUserMessage sanitizes technical errors', () => {
  assert.equal(
    resolveOcrUserMessage('OCR indisponível nesta versão'),
    DEFAULT_OCR_UNAVAILABLE_MESSAGE,
  );
});

test('quick add is contextual per screen', () => {
  assert.deepEqual(getContextualQuickAddActions('movimentos'), ['movement']);
  assert.deepEqual(getContextualQuickAddActions('creditos'), ['credit']);
  assert.deepEqual(getContextualQuickAddActions('ativos_garantias'), ['warranty']);
  assert.equal(getQuickAddContextLabel('movimentos'), 'Novo movimento');
});
