export interface RawTransaction {
  id?: string | number;
  type?: string;
  transaction_type?: string;
  transactionType?: string;
  amount?: number;
  category?: string;
  category_id?: string;
  categoryId?: string;
  category_label?: string;
  categoryLabel?: string;
  description?: string;
  notes?: string;
  date?: string;
  transaction_date?: string;
  transactionDate?: string;
  created_at?: string;
  createdAt?: string;
  currency?: string;
  receipt_id?: string | number | null;
  receiptId?: string | number | null;
  receipt_url?: string | null;
  receiptUrl?: string | null;
  receipt_image?: string | null;
  receiptImage?: string | null;
  account_id?: string | null;
  accountId?: string | null;
  destination_account_id?: string | null;
  destinationAccountId?: string | null;
}

export interface RawTransactionsResponse {
  transactions?: RawTransaction[];
  data?: RawTransaction[] | { transactions?: RawTransaction[] };
}

export interface RawCreateTransactionPayload {
  type: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  receipt_id?: string;
  receiptId?: string;
}
