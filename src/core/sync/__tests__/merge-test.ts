import { mergeRecords, type SyncRecord } from '@/core/sync';

const entry: SyncRecord = {
  type: 'expense',
  amount: 1250,
  description: 'Almoço',
  notes: null,
  category_id: 'c-dining',
  account_id: 'a-bank',
  destination_account_id: null,
  date: '2026-11-08',
  vehicle_id: null,
  vehicle_cost_type: null,
  quantity_milli: null,
  odometer_km: null,
  loan_id: null,
  loan_role: null,
  principal_amount: null,
  interest_amount: null,
  fees_amount: null,
  needs_review: 0,
  deleted_at: null,
};

describe('mergeRecords', () => {
  it('reports nothing to do when both sides already match', () => {
    const edited = { ...entry, amount: 1500 };
    expect(mergeRecords('entries', entry, edited, edited)).toEqual({ kind: 'same' });
  });

  it('combines changes to independent fields', () => {
    const local = { ...entry, description: 'Almoço com a equipa' };
    const server = { ...entry, amount: 1800 };
    expect(mergeRecords('entries', entry, local, server)).toEqual({
      kind: 'merged',
      data: { ...entry, description: 'Almoço com a equipa', amount: 1800 },
    });
  });

  it('flags the same field changed differently on both sides', () => {
    const local = { ...entry, amount: 1300 };
    const server = { ...entry, amount: 1400 };
    expect(mergeRecords('entries', entry, local, server)).toEqual({
      kind: 'conflict',
      fields: [
        'amount',
        'quantity_milli',
        'odometer_km',
        'principal_amount',
        'interest_amount',
        'fees_amount',
      ],
    });
  });

  it('accepts the same change made on both sides', () => {
    const local = { ...entry, amount: 1300, notes: 'x' };
    const server = { ...entry, amount: 1300 };
    expect(mergeRecords('entries', entry, local, server)).toEqual({
      kind: 'merged',
      data: { ...entry, amount: 1300, notes: 'x' },
    });
  });

  it('never combines coupled fields from different sides', () => {
    const local = { ...entry, category_id: 'c-groceries' };
    const server = {
      ...entry,
      type: 'transfer',
      category_id: null,
      destination_account_id: 'a-savings',
    };
    expect(mergeRecords('entries', entry, local, server)).toEqual({
      kind: 'conflict',
      fields: ['type', 'category_id', 'account_id', 'destination_account_id'],
    });
  });

  it('never silently drops an edit because of a concurrent deletion', () => {
    const deleted = { ...entry, deleted_at: '2026-11-08T12:00:00.000Z' };
    const edited = { ...entry, amount: 999 };
    expect(mergeRecords('entries', entry, edited, deleted).kind).toBe('conflict');
    expect(mergeRecords('entries', entry, deleted, edited).kind).toBe('conflict');
  });

  it('treats deletions on both sides as the same outcome', () => {
    const a = { ...entry, deleted_at: '2026-11-08T12:00:00.000Z' };
    const b = { ...entry, deleted_at: '2026-11-08T13:00:00.000Z' };
    expect(mergeRecords('entries', entry, a, b)).toEqual({ kind: 'same' });
  });

  it('combines budget fields edited on different sides', () => {
    const base = {
      category_id: 'cat',
      amount: 5000,
      currency: 'EUR',
      period: 'monthly',
      starts_on: '2026-11-01',
      deleted_at: null,
    };
    expect(
      mergeRecords('budgets', base, { ...base, amount: 7000 }, { ...base, period: 'yearly' }),
    ).toEqual({
      kind: 'merged',
      data: { ...base, amount: 7000, period: 'yearly' },
    });
    expect(
      mergeRecords('budgets', base, { ...base, amount: 7000 }, { ...base, amount: 9000 }).kind,
    ).toBe('conflict');
    expect(
      mergeRecords(
        'budgets',
        base,
        { ...base, amount: 7000 },
        { ...base, deleted_at: '2026-11-08T00:00:00.000Z' },
      ).kind,
    ).toBe('conflict');
  });

  it('treats any difference without a common base as a conflict', () => {
    expect(mergeRecords('entries', null, entry, entry)).toEqual({ kind: 'same' });
    expect(mergeRecords('entries', null, entry, { ...entry, amount: 1 })).toEqual({
      kind: 'conflict',
      fields: ['amount'],
    });
  });

  it('never combines parts of a fill-up changed on different devices', () => {
    const fill = {
      ...entry,
      vehicle_id: 'v1',
      vehicle_cost_type: 'fuel',
      quantity_milli: 40000,
      amount: 7000,
    };
    const local = { ...fill, amount: 7200 };
    const server = { ...fill, quantity_milli: 42000 };
    expect(mergeRecords('entries', fill, local, server)).toEqual({
      kind: 'conflict',
      fields: [
        'amount',
        'quantity_milli',
        'odometer_km',
        'principal_amount',
        'interest_amount',
        'fees_amount',
      ],
    });
    // Mudar a descrição num lado e o abastecimento no outro continua a combinar-se.
    const described = { ...fill, description: 'Galp A1' };
    expect(mergeRecords('entries', fill, described, server)).toEqual({
      kind: 'merged',
      data: { ...server, description: 'Galp A1' },
    });
  });
});

describe('presentational fields (category order)', () => {
  const category: SyncRecord = {
    name: 'Casa',
    type: 'expense',
    icon: 'home-outline',
    color: 'blue',
    system_key: null,
    essential: 1,
    sort_order: 0,
    deleted_at: null,
  };

  it('keeps the server order instead of raising a conflict', () => {
    expect(
      mergeRecords(
        'categories',
        category,
        { ...category, sort_order: 3 },
        {
          ...category,
          sort_order: 5,
        },
      ),
    ).toEqual({ kind: 'same' });
    expect(
      mergeRecords(
        'categories',
        category,
        { ...category, sort_order: 3, name: 'Habitação' },
        { ...category, sort_order: 5 },
      ),
    ).toEqual({ kind: 'merged', data: { ...category, name: 'Habitação', sort_order: 5 } });
  });

  it('lets a deletion win over a reorder on another device', () => {
    expect(
      mergeRecords(
        'categories',
        category,
        { ...category, sort_order: 4 },
        { ...category, deleted_at: '2026-11-11T10:00:00.000Z' },
      ),
    ).toEqual({ kind: 'same' });
  });
});
