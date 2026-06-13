import type { TransactionType } from './transaction.types';

/** Imagem seleccionada localmente — antes do upload ao backend. */
export interface ReceiptDraft {
  localUri: string;
  mimeType: string;
  fileName: string;
  width?: number;
  height?: number;
  /** Foto original antes do pré-processamento OCR — usada para preview e arquivo */
  originalLocalUri?: string;
  /** Imagem optimizada para OCR (expo-image-manipulator) */
  preprocessed?: boolean;
  preprocessVersion?: string;
  originalDimensions?: { width: number; height: number };
}

export type ReceiptStatus = 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed';

/** Resposta após upload bem-sucedido. */
export interface ReceiptUpload {
  id: string;
  url: string;
  localUri?: string;
  status: ReceiptStatus;
  /** OCR incluído na resposta do upload (quando o backend processa inline) */
  ocrResult?: ReceiptOcrResult | null;
}

export interface ReceiptOcrItem {
  name: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

export interface ReceiptOcrResult {
  merchantName?: string;
  totalAmount?: number;
  date?: string;
  suggestedCategory?: string;
  confidence?: number;
  rawText?: string;
  items?: ReceiptOcrItem[];
  /** Origem do OCR — útil para UI e debug */
  source?: 'api' | 'device' | 'demo';
}

/** Talão já enviado + OCR processado — pronto para confirmação */
export interface ProcessedReceipt {
  receiptId: string;
  receiptUrl: string;
  receiptImage: string;
  ocrResult: ReceiptOcrResult | null;
  /** Mensagem quando OCR falhou (ex: PDF no dispositivo) */
  ocrUnavailableReason?: string;
  draft: ReceiptDraft;
}

/** Item confirmado pelo utilizador — persistido em receipt_items */
export interface ReceiptConfirmedItem {
  id: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  category?: string;
}

/** Dados revistos pelo utilizador no ecrã de confirmação */
export interface ReceiptConfirmationInput {
  type: TransactionType;
  merchantName: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  /** Linhas de produto confirmadas (pode ser vazio) */
  items?: ReceiptConfirmedItem[];
}

export type ReceiptMeta = {
  receiptId: string;
  receiptUrl?: string;
  receiptImage?: string;
};

/** Valores editáveis no formulário de confirmação (strings para inputs) */
export type ReceiptFormItem = {
  id: string;
  name: string;
  amount: string;
  quantity?: string;
  unitPrice?: string;
  /** Item veio do OCR e ainda não foi editado */
  fromOcr?: boolean;
};

export type ReceiptFormValues = {
  type: TransactionType;
  merchantName: string;
  amount: string;
  category: string;
  description: string;
  date: string;
  items: ReceiptFormItem[];
};
