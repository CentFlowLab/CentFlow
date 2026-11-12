import { followingCharge } from '../forecast';
import { findDuplicate, frequentEntries, suggestionFor, type HistoryEntry } from '../suggestions';

const row = (over: Partial<HistoryEntry>): HistoryEntry => ({
  type: 'expense',
  description: 'Café',
  categoryId: 'dining',
  accountId: 'bank',
  amount: 120,
  date: '2026-11-01',
  ...over,
});

describe('suggestions from history', () => {
  it('lists repeated entries by use, ignoring case and accents', () => {
    const history = [
      row({ description: 'Café', date: '2026-11-03' }),
      row({ description: 'cafe ', date: '2026-11-02' }),
      row({ description: 'CAFÉ' }),
      row({ description: 'Gasóleo', categoryId: 'transport', date: '2026-11-04' }),
      row({ description: 'Gasoleo', categoryId: 'transport' }),
      row({ description: 'Uma vez só' }),
    ];
    const frequent = frequentEntries(history);
    expect(frequent.map((item) => [item.description, item.uses, item.categoryId])).toEqual([
      ['Café', 3, 'dining'],
      ['Gasóleo', 2, 'transport'],
    ]);
  });

  it('never suggests an ambiguous category or account', () => {
    const history = [
      row({ categoryId: 'dining', accountId: 'bank' }),
      row({ categoryId: 'groceries', accountId: 'bank' }),
      row({ categoryId: 'dining', accountId: 'card' }),
    ];
    // Categoria: 2 de 3 (67 %) → clara. Conta: 2 de 3 → clara.
    expect(suggestionFor(history, 'café', 'expense')).toMatchObject({
      categoryId: 'dining',
      accountId: 'bank',
    });
    const split = [row({ categoryId: 'dining' }), row({ categoryId: 'groceries' })];
    // 50 % / 50 %: sem sugestão de categoria.
    expect(suggestionFor(split, 'café', 'expense')?.categoryId ?? null).toBeNull();
    // Um só uso: nada.
    expect(suggestionFor([row({})], 'café', 'expense')).toBeNull();
    // Tipo diferente: nada.
    expect(suggestionFor(history, 'café', 'income')).toBeNull();
  });

  it('detects the same entry on the same day and account', () => {
    const history = [
      { id: 'e1', type: 'expense' as const, amount: 120, accountId: 'bank', date: '2026-11-01' },
    ];
    expect(
      findDuplicate(history, {
        type: 'expense',
        amount: 120,
        accountId: 'bank',
        date: '2026-11-01',
      }),
    ).toBe('e1');
    expect(
      findDuplicate(history, {
        type: 'expense',
        amount: 121,
        accountId: 'bank',
        date: '2026-11-01',
      }),
    ).toBeNull();
  });
});

describe('followingCharge', () => {
  it('advances by the period and keeps the end of the month', () => {
    expect(followingCharge({ nextOn: '2026-01-31', period: 'monthly' })).toBe('2026-02-28');
    expect(followingCharge({ nextOn: '2026-11-12', period: 'weekly' })).toBe('2026-11-19');
    expect(followingCharge({ nextOn: '2026-11-12', period: 'yearly' })).toBe('2027-11-12');
  });
});
