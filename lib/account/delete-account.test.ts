import assert from 'node:assert/strict';
import test from 'node:test';

import { getDeleteAccountConfirmationPhrase } from './delete-account.constants';

test('getDeleteAccountConfirmationPhrase devolve ELIMINAR', () => {
  assert.equal(getDeleteAccountConfirmationPhrase(), 'ELIMINAR');
});

test('confirmação OAuth exige frase exacta (case insensitive na UI)', () => {
  const phrase = getDeleteAccountConfirmationPhrase();
  assert.equal('eliminar'.toUpperCase(), phrase);
  assert.notEqual('APAGAR'.toUpperCase(), phrase);
});
