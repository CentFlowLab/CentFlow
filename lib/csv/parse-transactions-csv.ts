import type { TransactionType } from '@/lib/domain/transaction.types';
import { toIsoDateString } from '@/lib/utils/format';

import type { CsvColumnMapping, CsvImportRow, CsvParseResult } from './csv-import.types';

const DATE_HEADERS = ['data', 'date', 'transaction_date', 'transaction date', 'dia', 'data_mov'];
const DESC_HEADERS = [
  'descricao',
  'descrição',
  'description',
  'desc',
  'memo',
  'detalhe',
  'concepto',
  'conceito',
  'merchant',
  'loja',
];
const AMOUNT_HEADERS = ['valor', 'amount', 'montante', 'importe', 'value', 'quantia'];
const TYPE_HEADERS = ['tipo', 'type', 'debito_credito', 'd/c', 'dc', 'natureza'];

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function detectDelimiter(firstLine: string): ',' | ';' {
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const index = normalized.indexOf(normalizeHeader(alias));
    if (index >= 0) return index;
  }
  return -1;
}

function mapColumns(headers: string[]): CsvColumnMapping | null {
  const date = findColumnIndex(headers, DATE_HEADERS);
  const description = findColumnIndex(headers, DESC_HEADERS);
  const amount = findColumnIndex(headers, AMOUNT_HEADERS);
  const type = findColumnIndex(headers, TYPE_HEADERS);

  if (date < 0 || description < 0 || amount < 0) {
    return null;
  }

  return { date, description, amount, type: type >= 0 ? type : null };
}

function parsePtAmount(raw: string): number | undefined {
  const cleaned = raw
    .trim()
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/EUR/gi, '');

  if (!cleaned) return undefined;

  const negative = cleaned.startsWith('-') || cleaned.startsWith('(');
  const unsigned = cleaned.replace(/[()]/g, '').replace(/^-/, '').replace(',', '.');
  const value = Number(unsigned);

  if (!Number.isFinite(value) || value <= 0) return undefined;
  return negative ? -value : value;
}

function parseDate(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const eu = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (eu) {
    const day = eu[1].padStart(2, '0');
    const month = eu[2].padStart(2, '0');
    let year = eu[3];
    if (year.length === 2) {
      year = Number(year) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

function parseType(raw: string | undefined, signedAmount: number): TransactionType {
  const value = raw?.trim().toLowerCase() ?? '';

  if (/receita|income|credito|crédito|credit|entrada|\+/.test(value)) {
    return 'income';
  }
  if (/despesa|expense|debito|débito|debit|saida|saída|-/.test(value)) {
    return 'expense';
  }

  return signedAmount < 0 ? 'expense' : 'income';
}

function inferCategory(description: string, type: TransactionType): string {
  const text = description.toLowerCase();

  if (type === 'income') {
    if (/sal[aá]rio|ordenado|salary|vencimento/.test(text)) return 'salary';
    if (/freelance|recibo\s*verde|honor/.test(text)) return 'freelance';
    if (/reembolso|refund/.test(text)) return 'refund';
    return 'other';
  }

  if (/continente|lidl|pingo|auchan|mercado|super|minipre/.test(text)) return 'food';
  if (/uber|bolt|galp|bp|metro|cp|comboio|autocarro/.test(text)) return 'transport';
  if (/worten|fnac|amazon|mediamarkt/.test(text)) return 'shopping';
  if (/renda|habita|imobili/.test(text)) return 'housing';
  return 'other';
}

function rowFromCells(
  cells: string[],
  mapping: CsvColumnMapping,
  lineNumber: number,
): CsvImportRow {
  const dateRaw = cells[mapping.date] ?? '';
  const description = (cells[mapping.description] ?? '').trim();
  const amountRaw = cells[mapping.amount] ?? '';
  const typeRaw = mapping.type !== null ? cells[mapping.type] : undefined;

  const signed = parsePtAmount(amountRaw);
  const date = parseDate(dateRaw);

  if (!description) {
    return invalidRow(lineNumber, 'Descrição em falta');
  }
  if (signed === undefined) {
    return invalidRow(lineNumber, 'Valor inválido');
  }
  if (!date) {
    return invalidRow(lineNumber, 'Data inválida');
  }

  const type = parseType(typeRaw, signed);

  return {
    lineNumber,
    date,
    description,
    amount: Math.abs(signed),
    type,
    category: inferCategory(description, type),
    valid: true,
  };
}

function invalidRow(lineNumber: number, error: string): CsvImportRow {
  return {
    lineNumber,
    date: toIsoDateString(),
    description: '',
    amount: 0,
    type: 'expense',
    category: 'other',
    valid: false,
    error,
  };
}

export function parseTransactionsCsv(text: string, fileName = 'import.csv'): CsvParseResult {
  const errors: string[] = [];
  const normalized = text.replace(/^\uFEFF/, '').trim();

  if (!normalized) {
    return {
      fileName,
      delimiter: ';',
      headers: [],
      rows: [],
      validRows: [],
      invalidRows: [],
      errors: ['O ficheiro CSV está vazio.'],
    };
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      fileName,
      delimiter: ';',
      headers: [],
      rows: [],
      validRows: [],
      invalidRows: [],
      errors: ['O CSV precisa de cabeçalho e pelo menos uma linha de dados.'],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);
  const mapping = mapColumns(headers);

  if (!mapping) {
    return {
      fileName,
      delimiter,
      headers,
      rows: [],
      validRows: [],
      invalidRows: [],
      errors: [
        'Colunas obrigatórias em falta. Usa: Data, Descrição, Valor (Tipo opcional).',
        `Cabeçalhos encontrados: ${headers.join(', ')}`,
      ],
    };
  }

  const rows: CsvImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delimiter);
    if (cells.every((cell) => !cell.trim())) continue;

    rows.push(rowFromCells(cells, mapping, i + 1));
  }

  if (rows.length === 0) {
    errors.push('Nenhuma linha de dados encontrada após o cabeçalho.');
  }

  const validRows = rows.filter((row) => row.valid);
  const invalidRows = rows.filter((row) => !row.valid);

  if (validRows.length === 0 && rows.length > 0) {
    errors.push('Nenhuma linha válida para importar. Verifica datas e valores.');
  }

  return {
    fileName,
    delimiter,
    headers,
    rows,
    validRows,
    invalidRows,
    errors,
  };
}

export function csvRowToCreateInput(row: CsvImportRow) {
  return {
    type: row.type,
    amount: row.amount,
    category: row.category,
    description: row.description,
    date: row.date,
  };
}
