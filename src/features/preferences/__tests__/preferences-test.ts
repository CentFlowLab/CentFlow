import { createMemoryStore, type KeyValueStore } from '@/lib/storage/key-value-store';

import { createPreferencesRepository, DEFAULT_PREFERENCES, parsePreferences } from '../preferences';

describe('parsePreferences', () => {
  it('returns defaults for missing or corrupt data', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{not json')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('42')).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps valid fields and resets invalid ones', () => {
    expect(parsePreferences(JSON.stringify({ theme: 'dark', language: 'xx' }))).toEqual({
      theme: 'dark',
      language: 'system',
      analytics: false,
    });
    expect(parsePreferences(JSON.stringify({ theme: 'neon', language: 'es' }))).toEqual({
      theme: 'system',
      language: 'es',
      analytics: false,
    });
  });
});

describe('preferences repository', () => {
  it('round-trips saved preferences', async () => {
    const repository = createPreferencesRepository(createMemoryStore());
    await repository.save({ theme: 'light', language: 'en', analytics: true });
    await expect(repository.load()).resolves.toEqual({
      theme: 'light',
      language: 'en',
      analytics: true,
    });
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
