import type { ReceiptConfirmedItem, ReceiptConfirmationInput } from '@/lib/domain/receipt.types';

export type ReceiptItemRow = {
  id: string;
  receipt_id: string;
  user_id: string;
  transaction_id: string | null;
  name: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number;
  category: string | null;
  sort_order: number;
  created_at: string;
};

export function mapReceiptItemRow(row: ReceiptItemRow): ReceiptConfirmedItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    unitPrice: row.unit_price != null ? Number(row.unit_price) : undefined,
    totalPrice: Number(row.total_price),
    category: row.category ?? undefined,
  };
}

export function toReceiptItemInserts(
  userId: string,
  receiptId: string,
  transactionId: string | null,
  items: ReceiptConfirmedItem[],
) {
  return items.map((item, index) => ({
    user_id: userId,
    receipt_id: receiptId,
    transaction_id: transactionId,
    name: item.name,
    quantity: item.quantity ?? null,
    unit_price: item.unitPrice ?? null,
    total_price: item.totalPrice,
    category: item.category ?? null,
    sort_order: index,
  }));
}

export function toReceiptConfirmMetadataPatch(confirmation: ReceiptConfirmationInput) {
  return {
    merchant_name: confirmation.merchantName,
    total_amount: confirmation.amount,
    receipt_date: confirmation.date,
    suggested_category: confirmation.category,
  };
}
