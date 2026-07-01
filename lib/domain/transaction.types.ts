import type {
  ReceiptConfirmationInput,
  ReceiptConfirmedItem,
  ReceiptDraft,
  ReceiptMeta,
  ReceiptOcrResult,
} from './receipt.types';

export type CashTransactionType = 'expense' | 'income';

export type TransactionType = CashTransactionType | 'transfer';

export type TransactionFilter = 'all' | CashTransactionType;

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  categoryLabel: string;
  description?: string;
  date: string;
  currency: string;
  /** ID do talão no backend (após upload) */
  receiptId?: string | null;
  /** URL remota do talão */
  receiptUrl?: string | null;
  /** URI local ou remota para preview na lista */
  receiptImage?: string | null;
  /** Itens de linha confirmados do talão */
  receiptItems?: ReceiptConfirmedItem[];
  /** Conta associada (origem para despesa/transferência; destino para receita). */
  accountId?: string | null;
  /** Conta de destino (apenas transferências). */
  destinationAccountId?: string | null;
  /** Mês financeiro (YYYY-MM) — receitas podem contar num mês diferente da data. */
  budgetMonth?: string | null;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date: string;
  accountId?: string | null;
  destinationAccountId?: string | null;
  budgetMonth?: string | null;
  /** Upload + OCR inline (fluxo legado sem confirmação) */
  receipt?: ReceiptDraft;
  /** Talão já processado — usar após ecrã de confirmação */
  receiptMeta?: ReceiptMeta;
  /** Dados confirmados — enviados ao backend via PATCH /receipts/:id/confirm */
  confirmation?: ReceiptConfirmationInput;
  /** Saltar OCR no upload inline (preenchimento manual) */
  skipOcr?: boolean;
}

/** Fases do fluxo Opção A: upload → OCR → criar movimento */
export type CreateTransactionPhase =
  | 'uploading_receipt'
  | 'processing_ocr'
  | 'creating_transaction';

export type CreateTransactionOptions = {
  onPhase?: (phase: CreateTransactionPhase) => void;
};

export type CreateTransactionOutcome = {
  transaction: Transaction;
  /** Dados OCR (para ecrã de confirmação na próxima iteração) */
  ocrResult?: ReceiptOcrResult | null;
  ocrProcessed: boolean;
  /** Número de linhas de produto guardadas com o talão */
  itemsSavedCount: number;
};

/** Campos editáveis de um movimento existente */
export type UpdateTransactionInput = {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date: string;
  accountId?: string | null;
  destinationAccountId?: string | null;
  budgetMonth?: string | null;
};
