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
      fields: ['amount'],
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

  it('treats any difference without a common base as a conflict', () => {
    expect(mergeRecords('entries', null, entry, entry)).toEqual({ kind: 'same' });
    expect(mergeRecords('entries', null, entry, { ...entry, amount: 1 })).toEqual({
      kind: 'conflict',
      fields: ['amount'],
    });
  });
});
