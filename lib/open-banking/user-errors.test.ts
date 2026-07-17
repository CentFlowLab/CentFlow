import assert from 'node:assert/strict';
import test from 'node:test';

import { getOpenBankingUserMessage } from './user-errors';

test('traduz Edge Function non-2xx', () => {
  const msg = getOpenBankingUserMessage(
    new Error('Edge Function returned a non-2xx status code'),
  );
  assert.match(msg, /serviço bancário/i);
  assert.doesNotMatch(msg, /Edge Function/i);
});

test('traduz timeout de rede', () => {
  const msg = getOpenBankingUserMessage(new Error('network request failed'));
  assert.match(msg, /demorou|ligação/i);
});

test('mantém mensagem de produto curta em PT', () => {
  const msg = getOpenBankingUserMessage('Não foi possível ligar o banco');
  assert.equal(msg, 'Não foi possível ligar o banco');
});
