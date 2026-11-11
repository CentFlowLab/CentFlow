import {
  normalizeEntryInput,
  validateAccountInput,
  validateCategoryInput,
  validateEntryInput,
  type EntryInput,
  type EntryValidationContext,
} from '..';

const context: EntryValidationContext = {
  accounts: new Map([
    ['acc-eur', { id: 'acc-eur', currency: 'EUR', archivedAt: null }],
    ['acc-eur-2', { id: 'acc-eur-2', currency: 'EUR', archivedAt: null }],
    ['acc-usd', { id: 'acc-usd', currency: 'USD', archivedAt: null }],
    ['acc-archived', { id: 'acc-archived', currency: 'EUR', archivedAt: '2026-01-01T00:00:00Z' }],
  ]),
  categories: new Map([
    ['cat-food', { id: 'cat-food', type: 'expense' as const }],
    ['cat-salary', { id: 'cat-salary', type: 'income' as const }],
  ]),
};

const expense: EntryInput = {
  type: 'expense',
  amount: 1250,
  description: 'Supermercado',
  categoryId: 'cat-food',
  accountId: 'acc-eur',
  destinationAccountId: null,
  date: '2026-11-08',
  notes: null,
};

const transfer: EntryInput = {
  ...expense,
  type: 'transfer',
  categoryId: null,
  destinationAccountId: 'acc-eur-2',
};

describe('validateEntryInput', () => {
  it('accepts valid expense, income and transfer', () => {
    expect(validateEntryInput(expense, context)).toEqual({});
    expect(
      validateEntryInput({ ...expense, type: 'income', categoryId: 'cat-salary' }, context),
    ).toEqual({});
    expect(validateEntryInput(transfer, context)).toEqual({});
  });

  it.each([0, -100, 12.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'requires a positive integer amount (%p)',
    (amount) => {
      expect(validateEntryInput({ ...expense, amount }, context).amount).toBe('amountNotPositive');
    },
  );

  it('rejects amounts above the safe limit', () => {
    expect(validateEntryInput({ ...expense, amount: 1e13 }, context).amount).toBe('amountTooLarge');
  });

  it('requires an existing, active account', () => {
    expect(validateEntryInput({ ...expense, accountId: '' }, context).accountId).toBe('required');
    expect(validateEntryInput({ ...expense, accountId: 'nope' }, context).accountId).toBe(
      'accountNotFound',
    );
    expect(validateEntryInput({ ...expense, accountId: 'acc-archived' }, context).accountId).toBe(
      'accountArchived',
    );
  });

  it('allows keeping an archived account when editing', () => {
    const input = { ...expense, accountId: 'acc-archived' };
    expect(
      validateEntryInput(input, {
        ...context,
        previous: { accountId: 'acc-archived', destinationAccountId: null },
      }),
    ).toEqual({});
  });

  it('requires a category of the matching type for income and expense', () => {
    expect(validateEntryInput({ ...expense, categoryId: null }, context).categoryId).toBe(
      'categoryRequired',
    );
    expect(validateEntryInput({ ...expense, categoryId: 'ghost' }, context).categoryId).toBe(
      'categoryNotFound',
    );
    expect(validateEntryInput({ ...expense, categoryId: 'cat-salary' }, context).categoryId).toBe(
      'categoryTypeMismatch',
    );
  });

  it('rejects a destination account on income and expense', () => {
    expect(
      validateEntryInput({ ...expense, destinationAccountId: 'acc-eur-2' }, context)
        .destinationAccountId,
    ).toBe('invalid');
  });

  it('validates transfer accounts', () => {
    expect(
      validateEntryInput({ ...transfer, destinationAccountId: null }, context).destinationAccountId,
    ).toBe('required');
    expect(
      validateEntryInput({ ...transfer, destinationAccountId: 'acc-eur' }, context)
        .destinationAccountId,
    ).toBe('sameAccount');
    expect(
      validateEntryInput({ ...transfer, destinationAccountId: 'acc-usd' }, context)
        .destinationAccountId,
    ).toBe('currencyMismatch');
    expect(
      validateEntryInput({ ...transfer, destinationAccountId: 'acc-archived' }, context)
        .destinationAccountId,
    ).toBe('accountArchived');
    expect(validateEntryInput({ ...transfer, categoryId: 'cat-food' }, context).categoryId).toBe(
      'invalid',
    );
  });

  it('validates dates and text lengths', () => {
    expect(validateEntryInput({ ...expense, date: '2026-02-30' }, context).date).toBe(
      'invalidDate',
    );
    expect(
      validateEntryInput({ ...expense, description: 'x'.repeat(141) }, context).description,
    ).toBe('tooLong');
    expect(validateEntryInput({ ...expense, notes: 'x'.repeat(1001) }, context).notes).toBe(
      'tooLong',
    );
  });
});

describe('normalizeEntryInput', () => {
  it('trims text and clears irrelevant fields', () => {
    expect(
      normalizeEntryInput({
        ...expense,
        description: '  Café  ',
        notes: '   ',
        destinationAccountId: 'acc-eur-2',
      }),
    ).toEqual({
      ...expense,
      description: 'Café',
      notes: null,
      destinationAccountId: null,
      vehicleId: null,
      vehicleCostType: null,
      quantityMilli: null,
      odometerKm: null,
    });
    expect(normalizeEntryInput({ ...transfer, categoryId: 'cat-food' }).categoryId).toBeNull();
  });
});

describe('validateAccountInput', () => {
  const valid = { name: 'Banco', type: 'bank' as const, currency: 'EUR', initialBalance: 0 };

  it('accepts valid accounts, including negative initial balances', () => {
    expect(validateAccountInput(valid)).toEqual({});
    expect(validateAccountInput({ ...valid, type: 'card', initialBalance: -50000 })).toEqual({});
  });

  it('rejects invalid fields', () => {
    expect(
      validateAccountInput({
        name: '  ',
        type: 'crypto' as never,
        currency: 'EURO',
        initialBalance: 1.5,
      }),
    ).toEqual({
      name: 'required',
      type: 'invalid',
      currency: 'invalid',
      initialBalance: 'amountTooLarge',
    });
    expect(validateAccountInput({ ...valid, name: 'x'.repeat(61) }).name).toBe('tooLong');
  });
});

describe('validateCategoryInput', () => {
  it('validates name, type, icon and color', () => {
    expect(
      validateCategoryInput({ name: 'Casa', type: 'expense', icon: 'home', color: 'indigo' }),
    ).toEqual({});
    expect(
      validateCategoryInput({ name: '', type: 'other' as never, icon: '', color: '' }),
    ).toEqual({ name: 'required', type: 'invalid', icon: 'required', color: 'required' });
  });
});
