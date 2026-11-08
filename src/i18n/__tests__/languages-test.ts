import { resolveFormatLocale, resolveLanguage } from '../languages';
import en from '../locales/en';
import es from '../locales/es';
import ptPT from '../locales/pt-PT';

describe('resolveLanguage', () => {
  it('maps any Portuguese variant to pt-PT', () => {
    expect(resolveLanguage(['pt-PT'])).toBe('pt-PT');
    expect(resolveLanguage(['pt-BR'])).toBe('pt-PT');
  });

  it('picks the first supported device language', () => {
    expect(resolveLanguage(['de-DE', 'es-MX', 'en-US'])).toBe('es');
    expect(resolveLanguage(['en_US'])).toBe('en');
  });

  it('falls back to Portuguese', () => {
    expect(resolveLanguage([])).toBe('pt-PT');
    expect(resolveLanguage(['ja-JP'])).toBe('pt-PT');
  });
});

describe('resolveFormatLocale', () => {
  it('respects the device region when the language matches', () => {
    expect(resolveFormatLocale('en', ['en-US'])).toBe('en-US');
    expect(resolveFormatLocale('es', ['fr-FR', 'es-MX'])).toBe('es-MX');
  });

  it('uses the language default otherwise', () => {
    expect(resolveFormatLocale('en', ['pt-PT'])).toBe('en-GB');
    expect(resolveFormatLocale('pt-PT', [])).toBe('pt-PT');
  });
});

function collectKeys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? collectKeys(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function collectValues(value: object): string[] {
  return Object.values(value).flatMap((child) =>
    typeof child === 'object' && child !== null ? collectValues(child) : [String(child)],
  );
}

describe('translations', () => {
  const reference = collectKeys(ptPT).sort();

  it.each([
    ['en', en],
    ['es', es],
  ])('%s has exactly the same keys as pt-PT', (_, resource) => {
    expect(collectKeys(resource).sort()).toEqual(reference);
  });

  it.each([
    ['pt-PT', ptPT],
    ['en', en],
    ['es', es],
  ])('%s has no empty strings', (_, resource) => {
    expect(collectValues(resource).filter((text) => text.trim() === '')).toEqual([]);
  });
});
