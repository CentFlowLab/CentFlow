import type { TransactionType } from '@/lib/domain/transaction.types';

export type CsvImportRow = {
  lineNumber: number;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  valid: boolean;
  error?: string;
};

export type CsvParseResult = {
  fileName: string;
  delimiter: ',' | ';';
  headers: string[];
  rows: CsvImportRow[];
  validRows: CsvImportRow[];
  invalidRows: CsvImportRow[];
  errors: string[];
};

export type CsvColumnMapping = {
  date: number;
  description: number;
  amount: number;
  type: number | null;
};
