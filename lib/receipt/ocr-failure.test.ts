import assert from 'node:assert/strict';
import test from 'node:test';

import { traceOcrFailure } from '@/lib/doctor/financial-mutation-trace';
import { DEFAULT_OCR_FAILED_MESSAGE } from '@/lib/receipt/ocr-messages';
import { safeSanitizeOcrResult } from '@/lib/receipt/ocr-sanitize';
import type { ReceiptOcrResult } from '@/lib/domain/receipt.types';

test('traceOcrFailure never throws to caller', () => {
  assert.doesNotThrow(() =>
    traceOcrFailure('ocr_test_failure', {
      screen: 'movement_create',
      component: 'ocr-failure.test',
    }),
  );
});

test('safeSanitizeOcrResult returns null for empty OCR payload', () => {
  const empty: ReceiptOcrResult = { rawText: '', confidence: 0, source: 'device' };
  assert.equal(safeSanitizeOcrResult(empty), null);
});

test('safeSanitizeOcrResult never throws on malformed values', () => {
  const malformed = {
    merchantName: 'Loja',
    totalAmount: Number.NaN,
    confidence: Number.NaN,
    rawText: 'TOTAL 12,50',
    source: 'device',
  } as ReceiptOcrResult;

  assert.doesNotThrow(() => safeSanitizeOcrResult(malformed));
});

test('OCR failure message is human-readable', () => {
  assert.match(DEFAULT_OCR_FAILED_MESSAGE, /Não conseguimos ler este talão/);
  assert.match(DEFAULT_OCR_FAILED_MESSAGE, /preencher os dados manualmente/);
});
