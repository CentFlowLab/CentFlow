/** Resposta bruta POST /receipts (multipart) */
export interface RawReceiptResponse {
  id?: string | number;
  receipt_id?: string | number;
  receiptId?: string | number;
  url?: string;
  file_url?: string;
  fileUrl?: string;
  status?: string;
  ocr?: RawReceiptOcrPayload;
  ocr_result?: RawReceiptOcrPayload;
  ocrResult?: RawReceiptOcrPayload;
  data?: RawReceiptResponse;
}

/** Payload OCR — inline no upload ou endpoints dedicados */
export interface RawReceiptOcrPayload {
  merchant_name?: string;
  merchantName?: string;
  total_amount?: number;
  totalAmount?: number;
  amount?: number;
  date?: string;
  transaction_date?: string;
  transactionDate?: string;
  suggested_category?: string;
  suggestedCategory?: string;
  category?: string;
  confidence?: number;
  raw_text?: string;
  rawText?: string;
  items?: RawReceiptOcrItem[];
  status?: string;
  processing?: boolean;
  data?: RawReceiptOcrPayload;
}

/** Body POST /receipts/:id/ocr — hints para o motor no backend */
export interface RawReceiptOcrRequest {
  locale?: string;
  document_type?: string;
  documentType?: string;
  psm?: number;
  engine?: string;
  preprocess_version?: string;
  preprocessVersion?: string;
}

export interface RawReceiptOcrItem {
  name?: string;
  quantity?: number;
  unit_price?: number;
  unitPrice?: number;
  total?: number;
}

/** PATCH /receipts/:id/confirm */
export interface RawReceiptConfirmPayload {
  merchant_name?: string;
  merchantName?: string;
  total_amount?: number;
  totalAmount?: number;
  date?: string;
  category?: string;
  description?: string;
  type?: string;
}
