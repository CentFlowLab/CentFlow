import { initialAccountFor } from '../EntryForm';

// Conta por omissão (ADR-076): proposta num movimento novo, nunca uma conta arquivada.
const accounts = [
  { id: 'a', archivedAt: null },
  { id: 'b', archivedAt: null },
  { id: 'old', archivedAt: '2026-01-01T00:00:00.000Z' },
];

describe('initialAccountFor', () => {
  it('uses the default account from the preferences', () => {
    expect(initialAccountFor(accounts, { preferred: 'b', last: 'a' })).toBe('b');
  });

  it('falls back to the last used account with "last" or an archived default', () => {
    expect(initialAccountFor(accounts, { preferred: 'last', last: 'b' })).toBe('b');
    expect(initialAccountFor(accounts, { preferred: 'old', last: 'b' })).toBe('b');
    expect(initialAccountFor(accounts, { preferred: 'gone', last: null })).toBe('a');
  });

  it('lets a prefilled account win', () => {
    expect(initialAccountFor(accounts, { prefill: 'a', preferred: 'b', last: null })).toBe('a');
  });

  it('is empty without accounts', () => {
    expect(initialAccountFor([], { preferred: 'b', last: null })).toBe('');
  });
});
