import assert from 'node:assert/strict';
import { test } from 'node:test';

import { detectFinancialDomain, isFinancialDomainError } from './tags';
import { redactSentryValue, redactString } from './privacy';

test('redacta valores monetários e descrições sensíveis', () => {
  const input = 'Pagamento Continente €42,50 com IBAN PT50001234567890123456789';
  const output = redactString(input);
  assert.ok(!output.includes('42,50'));
  assert.ok(!output.includes('PT50001234567890123456789'));
  assert.ok(output.includes('[REDACTED]'));
});

test('redacta chaves sensíveis em objetos', () => {
  const result = redactSentryValue({
    amount: 120.5,
    description: 'Supermercado',
    screen: 'movements',
  }) as Record<string, unknown>;
  assert.equal(result.amount, '[REDACTED]');
  assert.equal(result.description, '[REDACTED]');
  assert.equal(result.screen, 'movements');
});

test('deteta domínio cashflow', () => {
  assert.equal(
    detectFinancialDomain('financial:cashflow_projection', 'build failed'),
    'cashflow_projection',
  );
});

test('deteta domínio amortização', () => {
  assert.equal(isFinancialDomainError('gocardless-sync', 'debt amortization failed'), true);
});

test('ignora erros de UI genéricos', () => {
  assert.equal(detectFinancialDomain('error-boundary', 'render failed'), null);
});
