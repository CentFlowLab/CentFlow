import type {
  ReceiptConfirmationInput,
  ReceiptDraft,
  ReceiptMeta,
  ReceiptOcrResult,
} from './receipt.types';

export type TransactionType = 'expense' | 'income';

export type TransactionFilter = 'all' | TransactionType;

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
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date: string;
  /** Upload + OCR inline (fluxo legado sem confirmação) */
  receipt?: ReceiptDraft;
  /** Talão já processado — usar após ecrã de confirmação */
  receiptMeta?: ReceiptMeta;
  /** Dados confirmados — enviados ao backend via PATCH /receipts/:id/confirm */
  confirmation?: ReceiptConfirmationInput;
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
};
