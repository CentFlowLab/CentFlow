import type { ReceiptConfirmationInput, ReceiptConfirmedItem } from '@/lib/domain/receipt.types';

const itemsByReceiptId = new Map<string, ReceiptConfirmedItem[]>();
const itemsByTransactionId = new Map<string, ReceiptConfirmedItem[]>();

function cloneItems(items: ReceiptConfirmedItem[]): ReceiptConfirmedItem[] {
  return items.map((item) => ({ ...item }));
}

export async function saveMockReceiptItems(
  receiptId: string,
  transactionId: string,
  items: ReceiptConfirmedItem[],
): Promise<number> {
  await new Promise((r) => setTimeout(r, 120));

  const stored = cloneItems(items);
  itemsByReceiptId.set(receiptId, stored);
  itemsByTransactionId.set(transactionId, stored);
  return stored.length;
}

export async function fetchMockReceiptItemsByReceiptId(
  receiptId: string,
): Promise<ReceiptConfirmedItem[]> {
  await new Promise((r) => setTimeout(r, 80));
  return cloneItems(itemsByReceiptId.get(receiptId) ?? []);
}

export async function fetchMockReceiptItemsByReceiptIds(
  receiptIds: string[],
): Promise<Map<string, ReceiptConfirmedItem[]>> {
  await new Promise((r) => setTimeout(r, 80));
  const result = new Map<string, ReceiptConfirmedItem[]>();
  for (const receiptId of receiptIds) {
    const items = itemsByReceiptId.get(receiptId);
    if (items?.length) result.set(receiptId, cloneItems(items));
  }
  return result;
}

export async function confirmMockReceiptData(
  receiptId: string,
  transactionId: string,
  confirmation: ReceiptConfirmationInput,
): Promise<number> {
  return saveMockReceiptItems(receiptId, transactionId, confirmation.items ?? []);
}

export function resetMockReceiptItems(): void {
  itemsByReceiptId.clear();
  itemsByTransactionId.clear();
}
