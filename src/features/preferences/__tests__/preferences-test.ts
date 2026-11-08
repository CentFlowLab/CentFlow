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
    });
    expect(parsePreferences(JSON.stringify({ theme: 'neon', language: 'es' }))).toEqual({
      theme: 'system',
      language: 'es',
    });
  });
});

describe('preferences repository', () => {
  it('round-trips saved preferences', async () => {
    const repository = createPreferencesRepository(createMemoryStore());
    await repository.save({ theme: 'light', language: 'en' });
    await expect(repository.load()).resolves.toEqual({ theme: 'light', language: 'en' });
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
