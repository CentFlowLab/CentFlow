import {
  findLikelyDuplicates,
  parseStatementAmount,
  parseStatementCsv,
  parseStatementDate,
  statementRange,
  STATEMENT_MAX_ROWS,
} from '../statement-csv';

describe('parseStatementDate', () => {
  it.each([
    ['2026-11-08', '2026-11-08'],
    ['2026/11/8', '2026-11-08'],
    ['08/11/2026', '2026-11-08'],
    ['8-11-2026', '2026-11-08'],
    ['08.11.2026', '2026-11-08'],
    ['2026-11-08 10:30', '2026-11-08'],
  ])('%s → %s', (input, expected) => {
    expect(parseStatementDate(input)).toBe(expected);
  });

  it.each(['31/02/2026', '2026-13-01', 'ontem', '', '11/2026'])('rejects %s', (input) => {
    expect(parseStatementDate(input)).toBeNull();
  });
});

describe('parseStatementAmount', () => {
  it.each([
    ['-23,50', -2350],
    ['23,50-', -2350],
    ['(23,50)', -2350],
    ['+1.234,56 €', 123456],
    ['1,234.56', 123456],
    ['EUR 10', 1000],
    ['0,00', 0],
  ])('%s → %d', (input, expected) => {
    expect(parseStatementAmount(input, 'EUR')).toBe(expected);
  });

  it('never uses floating point for cents', () => {
    expect(parseStatementAmount('0,1', 'EUR')).toBe(10);
    expect(parseStatementAmount('-1.000.000,07', 'EUR')).toBe(-100000007);
  });

  it.each(['', 'abc', '12,345,6'])('rejects %s', (input) => {
    expect(parseStatementAmount(input, 'EUR')).toBeNull();
  });
});

describe('parseStatementCsv', () => {
  it('reads a signed-amount statement with ; and decimal comma', () => {
    const csv = [
      'Data lançamento;Data valor;Descrição;Montante;Saldo',
      '08/11/2026;08/11/2026;COMPRA PINGO DOCE;-23,50;1 476,50',
      '07/11/2026;07/11/2026;"TRF RECEBIDA; SALARIO";1.200,00;1 500,00',
    ].join('\r\n');
    const result = parseStatementCsv(csv, 'EUR');
    expect(result).toEqual({
      ok: true,
      skipped: [],
      rows: [
        {
          line: 2,
          date: '2026-11-08',
          description: 'COMPRA PINGO DOCE',
          amount: 2350,
          type: 'expense',
        },
        {
          line: 3,
          date: '2026-11-07',
          description: 'TRF RECEBIDA; SALARIO',
          amount: 120000,
          type: 'income',
        },
      ],
    });
  });

  it('reads separate debit and credit columns, after title lines', () => {
    const csv = [
      'Extrato de conta',
      'Conta: PT50 0000',
      'Data mov.,Data valor,Descrição,Débito,Crédito,Saldo',
      '2026-11-05,2026-11-05,Farmácia,"12,30",,',
      '2026-11-06,2026-11-06,Reembolso,,"5,00",',
    ].join('\n');
    const result = parseStatementCsv(csv, 'EUR');
    expect(result.ok && result.rows).toEqual([
      { line: 4, date: '2026-11-05', description: 'Farmácia', amount: 1230, type: 'expense' },
      { line: 5, date: '2026-11-06', description: 'Reembolso', amount: 500, type: 'income' },
    ]);
  });

  it('lists lines it cannot read instead of guessing', () => {
    const csv = [
      'Date,Description,Amount',
      '2026-11-01,Coffee,-1.20',
      'not a date,Broken,-3.00',
      '2026-11-02,No amount,',
      '2026-11-03,Zero,0.00',
    ].join('\n');
    const result = parseStatementCsv(csv, 'EUR');
    expect(result.ok && result.rows.map((row) => row.description)).toEqual(['Coffee']);
    expect(result.ok && result.skipped).toEqual([3, 4, 5]);
  });

  it('handles a byte order mark, quotes with escaped quotes and tabs', () => {
    const csv = '﻿Fecha\tConcepto\tImporte\n03/11/2026\t"Tienda ""La Esquina"""\t-9,99\n';
    const result = parseStatementCsv(csv, 'EUR');
    expect(result.ok && result.rows[0]).toMatchObject({
      description: 'Tienda "La Esquina"',
      amount: 999,
    });
  });

  it('refuses files without recognisable columns, empty files and huge files', () => {
    expect(parseStatementCsv('   ', 'EUR')).toEqual({ ok: false, error: 'empty' });
    expect(parseStatementCsv('a;b;c\n1;2;3', 'EUR')).toEqual({ ok: false, error: 'noHeader' });
    const huge = [
      'Data;Descrição;Valor',
      ...Array.from({ length: STATEMENT_MAX_ROWS + 1 }, () => '01/11/2026;x;-1,00'),
    ].join('\n');
    expect(parseStatementCsv(huge, 'EUR')).toEqual({ ok: false, error: 'tooManyRows' });
  });
});

describe('findLikelyDuplicates', () => {
  const row = (line: number, amount: number, date = '2026-11-08') => ({
    line,
    date,
    description: 'Café',
    amount,
    type: 'expense' as const,
  });

  it('matches by date, type and amount, one existing movement per line', () => {
    const rows = [row(2, 120), row(3, 120), row(4, 500), row(5, 120, '2026-11-09')];
    const existing = [{ date: '2026-11-08', amount: 120, type: 'expense' as const }];
    expect([...findLikelyDuplicates(rows, existing)]).toEqual([2]);
  });

  it('does not treat income as a duplicate of an expense', () => {
    const existing = [{ date: '2026-11-08', amount: 120, type: 'income' as const }];
    expect(findLikelyDuplicates([row(2, 120)], existing).size).toBe(0);
  });

  it('reports the date range of the statement', () => {
    expect(statementRange([row(2, 1, '2026-11-09'), row(3, 1, '2026-10-30')])).toEqual({
      from: '2026-10-30',
      to: '2026-11-09',
    });
    expect(statementRange([])).toBeNull();
  });
});
