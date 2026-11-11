import {
  cardStatus,
  nextMonthlyDate,
  loanState,
  splitPayment,
  validateAccountInput,
  validateEntryInput,
  type EntryInput,
  type LoanLedgerEntry,
} from '..';

describe('credit cards', () => {
  it('derives debt, available credit and utilization from the balance', () => {
    expect(cardStatus({ creditLimit: 200_000 }, -65_000)).toEqual({
      limit: 200_000,
      debt: 65_000,
      available: 135_000,
      utilization: 0.325,
      overLimit: false,
    });
    // Saldo positivo (pagou a mais): não há dívida; o disponível é o limite.
    expect(cardStatus({ creditLimit: 200_000 }, 1_000)).toMatchObject({
      debt: 0,
      available: 200_000,
    });
    expect(cardStatus({ creditLimit: 100_000 }, -120_000)).toMatchObject({
      available: -20_000,
      overLimit: true,
    });
    expect(cardStatus({ creditLimit: null }, -5_000)).toEqual({
      limit: null,
      debt: 5_000,
      available: null,
      utilization: null,
      overLimit: false,
    });
  });

  it('keeps card fields on card accounts only', () => {
    const base = { name: 'Visa', currency: 'EUR', initialBalance: -65_000 };
    expect(
      validateAccountInput({
        ...base,
        type: 'card',
        creditLimit: 200_000,
        statementDay: 20,
        dueDay: 5,
      }),
    ).toEqual({});
    expect(validateAccountInput({ ...base, type: 'bank', creditLimit: 200_000 })).toEqual({
      creditLimit: 'cardOnly',
    });
    expect(validateAccountInput({ ...base, type: 'card', dueDay: 32 })).toEqual({
      dueDay: 'invalid',
    });
  });
});

describe('loan payments', () => {
  it('puts what is left after the principal in fees unless split', () => {
    expect(splitPayment(30_000, 25_000)).toEqual({ principal: 25_000, interest: 0, fees: 5_000 });
    expect(splitPayment(30_000, 25_000, 4_000)).toEqual({
      principal: 25_000,
      interest: 4_000,
      fees: 1_000,
    });
    expect(splitPayment(30_000, 25_000, 4_000, 500)).toBeNull();
    expect(splitPayment(30_000, 31_000)).toBeNull();
  });

  const ledger = (overrides: Partial<LoanLedgerEntry>): LoanLedgerEntry => ({
    id: 'e',
    type: 'expense',
    amount: 30_000,
    date: '2026-11-08',
    accountId: 'bank',
    description: 'Prestação',
    loanRole: 'payment',
    principalAmount: 25_000,
    interestAmount: 4_000,
    feesAmount: 1_000,
    ...overrides,
  });

  it('computes the debt from the opening balance and the linked payments', () => {
    const loan = { openingDebt: 1_550_000, openingOn: '2026-11-01', principalAmount: 2_000_000 };
    const state = loanState(loan, [
      ledger({ id: 'p2', date: '2026-12-08' }),
      ledger({ id: 'p1' }),
      // Anterior à abertura: já está refletida na dívida de abertura.
      ledger({ id: 'old', date: '2026-10-08' }),
    ]);
    expect(state).toMatchObject({
      original: 2_000_000,
      opening: 1_550_000,
      principalPaid: 50_000,
      interestPaid: 8_000,
      feesPaid: 2_000,
      debt: 1_500_000,
      amortized: 500_000,
      amortizedRatio: 0.25,
    });
    expect(state?.payments.map((line) => [line.id, line.debtBefore, line.debtAfter])).toEqual([
      ['p1', 1_550_000, 1_525_000],
      ['p2', 1_525_000, 1_500_000],
    ]);
    // Eliminar uma prestação é tirá-la da lista: a dívida recalcula-se.
    expect(loanState(loan, [ledger({ id: 'p1' })])?.debt).toBe(1_525_000);
  });

  it('adds money received from the loan to the debt, never as income', () => {
    const state = loanState(
      { openingDebt: 100_000, openingOn: '2026-01-01', principalAmount: null },
      [
        ledger({
          id: 'd',
          type: 'income',
          loanRole: 'disbursement',
          amount: 50_000,
          principalAmount: null,
        }),
      ],
    );
    expect(state).toMatchObject({ debt: 150_000, disbursed: 50_000, amortized: null });
    expect(loanState({ openingDebt: null, openingOn: null, principalAmount: null }, [])).toBeNull();
  });

  it('validates the split and the role of linked entries', () => {
    const context = {
      accounts: new Map([['a', { id: 'a', currency: 'EUR', archivedAt: null }]]),
      categories: new Map([
        ['c', { id: 'c', type: 'expense' as const }],
        ['i', { id: 'i', type: 'income' as const }],
      ]),
      loans: new Set(['loan']),
    };
    const payment: EntryInput = {
      type: 'expense',
      amount: 30_000,
      description: 'Prestação',
      categoryId: 'c',
      accountId: 'a',
      destinationAccountId: null,
      date: '2026-11-08',
      notes: null,
      loanId: 'loan',
      loanRole: 'payment',
      principalAmount: 25_000,
      interestAmount: 5_000,
      feesAmount: 0,
    };
    expect(validateEntryInput(payment, context)).toEqual({});
    expect(validateEntryInput({ ...payment, interestAmount: 1_000 }, context)).toEqual({
      principalAmount: 'splitMismatch',
    });
    expect(
      validateEntryInput(
        { ...payment, type: 'income', categoryId: 'i', loanRole: 'disbursement' },
        context,
      ),
    ).toEqual({ principalAmount: 'invalid' });
    expect(
      validateEntryInput(
        {
          ...payment,
          type: 'income',
          categoryId: 'i',
          loanRole: 'disbursement',
          principalAmount: null,
          interestAmount: null,
          feesAmount: null,
        },
        context,
      ),
    ).toEqual({});
  });
});

describe('monthly dates', () => {
  it('finds the next payment day, clamped to short months', () => {
    expect(nextMonthlyDate(5, '2026-11-03')).toBe('2026-11-05');
    expect(nextMonthlyDate(5, '2026-11-05')).toBe('2026-11-05');
    expect(nextMonthlyDate(5, '2026-11-06')).toBe('2026-12-05');
    expect(nextMonthlyDate(31, '2026-02-10')).toBe('2026-02-28');
    expect(nextMonthlyDate(10, '2026-12-20')).toBe('2027-01-10');
  });
});
