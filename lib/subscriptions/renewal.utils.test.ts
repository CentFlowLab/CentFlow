import assert from 'node:assert/strict';
import test from 'node:test';

import { SUBSCRIPTION_RENEWAL_ALERT_DAYS } from './renewal.constants';
import {
  countRenewalsSoon,
  daysUntilRenewal,
  getRenewalStatus,
  isRenewalWithinAlert,
} from './renewal.utils';

const AS_OF = new Date('2026-06-19T12:00:00');

test('renovação passada mostra atraso, não "em breve"', () => {
  const status = getRenewalStatus('2026-06-10', AS_OF);
  assert.equal(status.tone, 'danger');
  assert.match(status.label, /atraso/i);
  assert.ok(status.diffDays !== null && status.diffDays < 0);
});

test('renovação dentro da janela global', () => {
  const renewsAt = '2026-06-25';
  assert.ok(isRenewalWithinAlert(renewsAt, AS_OF, SUBSCRIPTION_RENEWAL_ALERT_DAYS));
  const status = getRenewalStatus(renewsAt, AS_OF);
  assert.equal(status.tone, 'warning');
  assert.match(status.label, /Renova em/);
});

test('renovação fora da janela fica activa', () => {
  const status = getRenewalStatus('2026-08-01', AS_OF);
  assert.equal(status.tone, 'default');
  assert.equal(status.label, 'Activa');
});

test('countRenewalsSoon ignora datas passadas', () => {
  const count = countRenewalsSoon(
    [
      { renewsAt: '2026-06-01' },
      { renewsAt: '2026-06-25' },
      { renewsAt: '2026-08-01' },
    ],
    AS_OF,
  );
  assert.equal(count, 1);
});

test('daysUntilRenewal arredonda para cima', () => {
  const days = daysUntilRenewal('2026-06-20T08:00:00', AS_OF);
  assert.equal(days, 1);
});
