import { isValidCalendarDate, type CalendarDate } from '../finance/dates';
import { parseAmountInput, type CurrencyCode } from '../money';
import { normalizeSearchText } from '../text/search';

/** Linha de extrato pronta a pré-visualizar. O valor é positivo; o sinal vem do tipo. */
export type StatementRow = {
  /** Número da linha no ficheiro (1 = cabeçalho). */
  line: number;
  date: CalendarDate;
  description: string;
  amount: number;
  type: 'expense' | 'income';
};

export type StatementParseError = 'empty' | 'noHeader' | 'tooManyRows';

export type StatementParseResult =
  { ok: true; rows: StatementRow[]; skipped: number[] } | { ok: false; error: StatementParseError };

export const STATEMENT_MAX_ROWS = 2000;
export const STATEMENT_DESCRIPTION_MAX = 140;

type Columns = {
  date: number;
  description: number;
  amount: number | null;
  debit: number | null;
  credit: number | null;
};

const DATE_HEADERS = ['data mov', 'data lanc', 'data operacao', 'data', 'date', 'fecha'];
const DESCRIPTION_HEADERS = [
  'descricao',
  'description',
  'descripcion',
  'concepto',
  'detalhe',
  'movimento',
  'memo',
  'payee',
];
const AMOUNT_HEADERS = ['montante', 'valor', 'importe', 'amount', 'quantia'];
const DEBIT_HEADERS = ['debito', 'debit', 'cargo', 'saida'];
const CREDIT_HEADERS = ['credito', 'credit', 'abono', 'entrada'];

/** Separa as linhas de CSV respeitando aspas (incluindo quebras de linha dentro delas). */
function splitRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.trim() === '') {
      quoted = true;
      field = '';
    } else if (char === delimiter) {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records.filter((row) => row.some((value) => value.trim() !== ''));
}

/** O separador mais frequente numa das primeiras linhas (fora de aspas); títulos não contam. */
function detectDelimiter(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .slice(0, 10)
    .map((line) => line.replace(/"[^"]*"/g, ''));
  let best = { candidate: ';', count: 0 };
  for (const candidate of [';', ',', '\t']) {
    for (const line of lines) {
      const count = line.split(candidate).length - 1;
      if (count > best.count) best = { candidate, count };
    }
  }
  return best.candidate;
}

function findColumn(
  headers: readonly string[],
  names: readonly string[],
  taken: readonly (number | null)[] = [],
): number | null {
  const free = (index: number) => index !== -1 && !taken.includes(index);
  for (const name of names) {
    const index = headers.findIndex(
      (header, at) => free(at) && (header === name || header.startsWith(`${name} `)),
    );
    if (index !== -1) return index;
  }
  for (const name of names) {
    // "data valor" é uma data, não um valor: cabeçalhos começados por "data" não contam aqui.
    const index = headers.findIndex(
      (header, at) =>
        free(at) && header.includes(name) && (names === DATE_HEADERS || !header.startsWith('data')),
    );
    if (index !== -1) return index;
  }
  return null;
}

function detectColumns(header: readonly string[]): Columns | null {
  const headers = header.map((value) =>
    normalizeSearchText(value)
      .replace(/[^a-z0-9 ]/g, ' ')
      .trim(),
  );
  const date = findColumn(headers, DATE_HEADERS);
  const description = findColumn(headers, DESCRIPTION_HEADERS, [date]);
  const debit = findColumn(headers, DEBIT_HEADERS, [date, description]);
  const credit = findColumn(headers, CREDIT_HEADERS, [date, description, debit]);
  const amount =
    debit !== null && credit !== null
      ? null
      : findColumn(headers, AMOUNT_HEADERS, [date, description]);
  if (date === null || description === null) return null;
  if (amount === null && (debit === null || credit === null)) return null;
  return {
    date,
    description,
    amount,
    debit: amount === null ? debit : null,
    credit: amount === null ? credit : null,
  };
}

/** Aceita AAAA-MM-DD, AAAA/MM/DD e DD/MM/AAAA (também com "-" ou "."). Nunca usa `Date`. */
export function parseStatementDate(value: string): CalendarDate | null {
  const text = value.trim().slice(0, 10);
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  let date: string | null = null;
  if (match) {
    date = `${match[1]}-${match[2]!.padStart(2, '0')}-${match[3]!.padStart(2, '0')}`;
  } else {
    match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
    if (match) date = `${match[3]}-${match[2]!.padStart(2, '0')}-${match[1]!.padStart(2, '0')}`;
  }
  return date && isValidCalendarDate(date) ? date : null;
}

/** Valor com sinal em unidades mínimas. Aceita "-12,50", "12,50-", "1.234,56 €" e "(12,50)". */
export function parseStatementAmount(value: string, currency: CurrencyCode): number | null {
  let text = value.replace(/[\s  ]/g, '').replace(/[€$£]|EUR|USD|GBP/gi, '');
  if (text === '') return null;
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.endsWith('-')) {
    negative = true;
    text = text.slice(0, -1);
  }
  if (text.startsWith('+')) text = text.slice(1);
  const parsed = parseAmountInput(text, currency, { allowNegative: true });
  if (!parsed.ok) return null;
  return negative ? -Math.abs(parsed.amountMinor) : parsed.amountMinor;
}

/**
 * Lê um extrato CSV. Linhas que não se percebem (data, valor) são indicadas em `skipped` em vez
 * de adivinhadas. Não grava nada: o resultado é só para pré-visualizar.
 */
export function parseStatementCsv(text: string, currency: CurrencyCode): StatementParseResult {
  const content = text.replace(/^﻿/, '');
  if (content.trim() === '') return { ok: false, error: 'empty' };
  const records = splitRecords(content, detectDelimiter(content));
  // Alguns bancos põem linhas de título antes do cabeçalho: procura nas primeiras 10.
  let headerIndex = -1;
  let columns: Columns | null = null;
  for (let index = 0; index < Math.min(records.length, 10); index += 1) {
    columns = detectColumns(records[index]!);
    if (columns) {
      headerIndex = index;
      break;
    }
  }
  if (!columns) return { ok: false, error: 'noHeader' };
  const body = records.slice(headerIndex + 1);
  if (body.length > STATEMENT_MAX_ROWS) return { ok: false, error: 'tooManyRows' };

  const rows: StatementRow[] = [];
  const skipped: number[] = [];
  body.forEach((record, offset) => {
    const line = headerIndex + offset + 2;
    const date = parseStatementDate(record[columns.date] ?? '');
    let signed: number | null = null;
    if (columns.amount !== null) {
      signed = parseStatementAmount(record[columns.amount] ?? '', currency);
    } else {
      const debit = parseStatementAmount(record[columns.debit!] ?? '', currency);
      const credit = parseStatementAmount(record[columns.credit!] ?? '', currency);
      if (debit !== null && debit !== 0 && (credit === null || credit === 0)) {
        signed = -Math.abs(debit);
      } else if (credit !== null && credit !== 0 && (debit === null || debit === 0)) {
        signed = Math.abs(credit);
      }
    }
    if (date === null || signed === null || signed === 0) {
      skipped.push(line);
      return;
    }
    const description = (record[columns.description] ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, STATEMENT_DESCRIPTION_MAX);
    rows.push({
      line,
      date,
      description,
      amount: Math.abs(signed),
      type: signed < 0 ? 'expense' : 'income',
    });
  });
  return { ok: true, rows, skipped };
}

export type ExistingMovement = Pick<StatementRow, 'date' | 'amount' | 'type'>;

/**
 * Linhas que provavelmente já estão registadas: mesma data, valor e tipo que um movimento da
 * conta. Conta como multiconjunto, para que dois cafés iguais no mesmo dia não se anulem com um só.
 */
export function findLikelyDuplicates(
  rows: readonly StatementRow[],
  existing: readonly ExistingMovement[],
): Set<number> {
  const key = (item: ExistingMovement) => `${item.date}|${item.type}|${item.amount}`;
  const available = new Map<string, number>();
  for (const item of existing) available.set(key(item), (available.get(key(item)) ?? 0) + 1);
  const duplicates = new Set<number>();
  for (const row of rows) {
    const remaining = available.get(key(row)) ?? 0;
    if (remaining > 0) {
      duplicates.add(row.line);
      available.set(key(row), remaining - 1);
    }
  }
  return duplicates;
}

/** Intervalo de datas do extrato, para procurar duplicados só nessa janela. */
export function statementRange(
  rows: readonly StatementRow[],
): { from: CalendarDate; to: CalendarDate } | null {
  if (rows.length === 0) return null;
  let from = rows[0]!.date;
  let to = rows[0]!.date;
  for (const row of rows) {
    if (row.date < from) from = row.date;
    if (row.date > to) to = row.date;
  }
  return { from, to };
}
