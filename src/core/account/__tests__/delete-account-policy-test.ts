import {
  DELETE_CONFIRMATION,
  RECENT_AUTH_MS,
  deleteAccountCorsHeaders,
  evaluateDeleteAccount,
  isAllowedWebOrigin,
} from '../delete-account-policy';

const NOW = Date.parse('2026-11-08T12:00:00.000Z');

describe('delete account confirmation', () => {
  it('accepts an explicit confirmation after a recent sign-in', () => {
    expect(
      evaluateDeleteAccount({
        confirm: DELETE_CONFIRMATION,
        lastSignInAt: new Date(NOW - 60_000).toISOString(),
        now: NOW,
      }),
    ).toEqual({ ok: true });
  });

  it('rejects a missing confirmation and an arbitrary user id is irrelevant', () => {
    expect(
      evaluateDeleteAccount({
        confirm: undefined,
        lastSignInAt: new Date(NOW).toISOString(),
        now: NOW,
      }),
    ).toEqual({ ok: false, error: 'confirmation_required' });
    expect(
      evaluateDeleteAccount({
        confirm: 'delete',
        lastSignInAt: new Date(NOW).toISOString(),
        now: NOW,
      }).ok,
    ).toBe(false);
  });

  it('rejects a session that is not recent', () => {
    expect(
      evaluateDeleteAccount({
        confirm: DELETE_CONFIRMATION,
        lastSignInAt: new Date(NOW - RECENT_AUTH_MS - 1).toISOString(),
        now: NOW,
      }),
    ).toEqual({ ok: false, error: 'reauth_required' });
    expect(
      evaluateDeleteAccount({
        confirm: DELETE_CONFIRMATION,
        lastSignInAt: null,
        now: NOW,
      }),
    ).toEqual({ ok: false, error: 'reauth_required' });
  });

  it('allows only the web origins the app actually uses', () => {
    expect(isAllowedWebOrigin('http://localhost:8081', [])).toBe(true);
    expect(isAllowedWebOrigin('https://app.example', ['https://app.example'])).toBe(true);
    expect(isAllowedWebOrigin('https://evil.example', [])).toBe(false);
    expect(isAllowedWebOrigin(null, [])).toBe(false);
    expect(deleteAccountCorsHeaders(null, [])['Access-Control-Allow-Origin']).toBeUndefined();
    expect(
      deleteAccountCorsHeaders('https://evil.example', [])['Access-Control-Allow-Origin'],
    ).toBeUndefined();
    expect(
      deleteAccountCorsHeaders('http://localhost:8081', [])['Access-Control-Allow-Origin'],
    ).toBe('http://localhost:8081');
  });
});
