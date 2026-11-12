import { buildBackup, parseBackup, planRestore, sha256Hex, toCsv } from '..';

describe('sha256Hex', () => {
  it('matches the standard digest, including accents and emoji', () => {
    // Valores de referência: hashlib.sha256 do Python sobre o texto em UTF-8.
    const vectors: [string, string][] = [
      ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
      ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
      ['Café com açúcar 💶', '242ccdc82389d51be311d8aad84c96a7e2f84526e5fba6061909f2349ce9b774'],
      ['x'.repeat(1000), '44f8354494a5ba03ba1792a8d3e9c534c47a9181980fde7a3f44b06ef2ae7c7f'],
    ];
    for (const [text, digest] of vectors) expect(sha256Hex(text)).toBe(digest);
  });
});

const row = (id: string, updated: string) => ({ id, updated_at: updated, name: id });

describe('backup file', () => {
  const backup = buildBackup({
    createdAt: '2026-11-12T10:00:00.000Z',
    schemaVersion: 16,
    appVersion: '0.1.17',
    tables: { accounts: [row('a1', '2026-11-10'), row('a2', '2026-11-10')] },
    attachments: [],
  });

  it('round-trips and rejects a tampered, foreign or newer file', () => {
    const text = JSON.stringify(backup);
    expect(parseBackup(text, 16)).toMatchObject({ ok: true });
    expect(backup.counts).toEqual({ accounts: 2 });
    expect(parseBackup(text.replace('"a2"', '"a3"'), 16)).toEqual({
      ok: false,
      reason: 'corrupted',
    });
    expect(parseBackup('{"hello":1}', 16)).toEqual({ ok: false, reason: 'notBackup' });
    expect(parseBackup('not json', 16)).toEqual({ ok: false, reason: 'notBackup' });
    expect(parseBackup(text, 15)).toEqual({ ok: false, reason: 'tooNew' });
  });

  it('never plans to overwrite newer rows nor bring back deleted ones', () => {
    const local = new Map([
      ['a1', { updated_at: '2026-11-11', deleted_at: null }],
      ['a2', { updated_at: '2026-11-01', deleted_at: '2026-11-11' }],
    ]);
    const plan = planRestore(
      {
        tables: {
          accounts: [row('a1', '2026-11-10'), row('a2', '2026-11-10'), row('a3', '2026-11-10')],
        },
      },
      () => local,
    );
    expect(plan.totalInsert).toBe(1);
    expect(plan.insert.accounts?.map((item) => item.id)).toEqual(['a3']);
    expect(plan.totalUpdate).toBe(0);
    expect(plan.keptNewer).toBe(1);
    expect(plan.keptDeleted).toBe(1);

    const older = new Map([['a1', { updated_at: '2026-11-01', deleted_at: null }]]);
    expect(
      planRestore({ tables: { accounts: [row('a1', '2026-11-10')] } }, () => older),
    ).toMatchObject({
      totalUpdate: 1,
    });
  });
});

describe('toCsv', () => {
  it('quotes only when needed', () => {
    expect(
      toCsv(
        ['a', 'b'],
        [
          ['x', 'olá, "mundo"'],
          [1, null],
        ],
      ),
    ).toBe('a,b\r\nx,"olá, ""mundo"""\r\n1,\r\n');
  });
});
