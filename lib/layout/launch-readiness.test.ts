import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAssetsQuickAddActions,
  getHomeQuickAddActions,
  getMovementsQuickAddActions,
} from '@/lib/layout/contextual-add';
import { sanitizeLogContext, sanitizeLogMessage } from '@/lib/security/log-sanitize';

test('botão + contextual: Home mostra movimento, ativo e objetivo', () => {
  assert.deepEqual(getHomeQuickAddActions(), ['movement', 'asset', 'goal']);
});

test('botão + contextual: Movimentos mostra só movimento ou subscrição', () => {
  assert.deepEqual(getMovementsQuickAddActions('movimentos'), ['movement']);
  assert.deepEqual(getMovementsQuickAddActions('subscricoes'), ['subscription']);
});

test('botão + contextual: Ativos adapta ao tab activo', () => {
  assert.deepEqual(getAssetsQuickAddActions('objetivos'), ['goal']);
  assert.deepEqual(getAssetsQuickAddActions('garantias'), ['warranty']);
  assert.deepEqual(getAssetsQuickAddActions('inventario'), ['asset']);
});

test('Doctor sanitiza passwords e tokens nos logs', () => {
  const safe = sanitizeLogContext({
    password: 'secret123',
    access_token: 'eyJhbG.abc.def',
    screen: 'movement_create',
  });
  assert.equal(safe?.password, '[REDACTED]');
  assert.equal(safe?.access_token, '[REDACTED]');
  assert.equal(safe?.screen, 'movement_create');
});

test('Doctor sanitiza mensagens com Bearer tokens', () => {
  assert.equal(sanitizeLogMessage('Auth Bearer abc123xyz'), '[REDACTED]');
});
