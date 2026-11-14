import { createMemoryStore, type KeyValueStore } from '@/lib/storage/key-value-store';

import {
  createPreferencesRepository,
  DEFAULT_PREFERENCES,
  legacyFinancialMonthStartDay,
  parsePreferences,
} from '../preferences';

describe('parsePreferences', () => {
  it('returns defaults for missing or corrupt data', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{not json')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('42')).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps valid fields and resets invalid ones', () => {
    expect(parsePreferences(JSON.stringify({ theme: 'dark', language: 'xx' }))).toEqual({
      ...DEFAULT_PREFERENCES,
      theme: 'dark',
      language: 'system',
    });
    expect(parsePreferences(JSON.stringify({ theme: 'neon', language: 'es' }))).toEqual({
      ...DEFAULT_PREFERENCES,
      theme: 'system',
      language: 'es',
    });
  });
});

describe('haptics preference', () => {
  it('is on by default and for older saved preferences without the field', () => {
    expect(DEFAULT_PREFERENCES.haptics).toBe(true);
    expect(parsePreferences(JSON.stringify({ theme: 'dark', language: 'pt-PT' })).haptics).toBe(
      true,
    );
  });

  it('stays off once turned off', () => {
    expect(parsePreferences(JSON.stringify({ haptics: false })).haptics).toBe(false);
  });
});

describe('Phase 1 and 2 preferences', () => {
  it('defaults to automatic currency and region, values shown, last account and day 1', () => {
    expect(DEFAULT_PREFERENCES).toMatchObject({
      primaryCurrency: 'auto',
      newAccountCurrency: 'auto',
      formatRegion: 'auto',
      discreetAmounts: false,
      defaultAccountId: 'last',
    });
    // JSON antigo, sem os campos novos.
    expect(parsePreferences(JSON.stringify({ theme: 'dark', language: 'pt-PT' }))).toMatchObject({
      primaryCurrency: 'auto',
      formatRegion: 'auto',
      discreetAmounts: false,
      defaultAccountId: 'last',
    });
  });

  it('sends invalid values back to the default', () => {
    const parsed = parsePreferences(
      JSON.stringify({
        primaryCurrency: 'EU',
        newAccountCurrency: 42,
        formatRegion: 'xx-YY',
        discreetAmounts: 'yes',
        defaultAccountId: '  ',
      }),
    );
    expect(parsed).toMatchObject({
      primaryCurrency: 'auto',
      newAccountCurrency: 'auto',
      formatRegion: 'auto',
      discreetAmounts: false,
      defaultAccountId: 'last',
    });
  });

  it('reads the start day kept on this device by 0.1.22 only to move it to the account', () => {
    for (const bad of [0, 1, 32, 2.5, '25', null]) {
      expect(
        legacyFinancialMonthStartDay(JSON.stringify({ financialMonthStartDay: bad })),
      ).toBeNull();
    }
    expect(legacyFinancialMonthStartDay(JSON.stringify({ financialMonthStartDay: 25 }))).toBe(25);
    expect(legacyFinancialMonthStartDay('not json')).toBeNull();
    // Deixou de ser uma preferência local (ADR-079).
    expect(parsePreferences(JSON.stringify({ financialMonthStartDay: 25 }))).not.toHaveProperty(
      'financialMonthStartDay',
    );
  });
});

describe('preferences repository', () => {
  it('round-trips saved preferences', async () => {
    const repository = createPreferencesRepository(createMemoryStore());
    const saved = {
      ...DEFAULT_PREFERENCES,
      theme: 'light' as const,
      language: 'en' as const,
      analytics: true,
      haptics: false,
      primaryCurrency: 'USD',
      formatRegion: 'en-US' as const,
      discreetAmounts: true,
      defaultAccountId: 'acc-1',
    };
    await repository.save(saved);
    await expect(repository.load()).resolves.toEqual(saved);
  });

  it('keeps usage statistics off unless explicitly turned on', async () => {
    const store = createMemoryStore();
    await store.setItem('preferences.v1', JSON.stringify({ theme: 'dark', analytics: 'yes' }));
    await expect(createPreferencesRepository(store).load()).resolves.toMatchObject({
      analytics: false,
    });
  });

  it('falls back to defaults when storage fails', async () => {
    const failing: KeyValueStore = {
      getItem: () => Promise.reject(new Error('unavailable')),
      setItem: () => Promise.reject(new Error('unavailable')),
      removeItem: () => Promise.reject(new Error('unavailable')),
    };
    await expect(createPreferencesRepository(failing).load()).resolves.toEqual(DEFAULT_PREFERENCES);
  });
});
