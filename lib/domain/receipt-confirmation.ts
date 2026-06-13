import type {
  ReceiptConfirmationInput,
  ReceiptFormItem,
  ReceiptFormValues,
  ReceiptOcrResult,
} from './receipt.types';
import { toIsoDateString } from '@/lib/utils/format';

function createItemId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

export function emptyReceiptFormItem(): ReceiptFormItem {
  return {
    id: createItemId('new', Date.now()),
    name: '',
    amount: '',
  };
}

export function emptyReceiptFormValues(): ReceiptFormValues {
  return {
    type: 'expense',
    merchantName: '',
    amount: '',
    category: '',
    description: '',
    date: toIsoDateString(),
    items: [],
  };
}

export function ocrItemsToFormItems(
  ocr: ReceiptOcrResult | null | undefined,
): ReceiptFormItem[] {
  if (!ocr?.items?.length) return [];

  return ocr.items.map((item, index) => ({
    id: createItemId('ocr', index),
    name: item.name,
    amount: item.total !== undefined ? String(item.total) : '',
    fromOcr: true,
  }));
}

export function ocrToFormValues(ocr: ReceiptOcrResult | null): ReceiptFormValues {
  if (!ocr) return emptyReceiptFormValues();

  return {
    type: 'expense',
    merchantName: ocr.merchantName ?? '',
    amount: ocr.totalAmount !== undefined ? String(ocr.totalAmount) : '',
    category: ocr.suggestedCategory ?? '',
    description: ocr.merchantName ?? '',
    date: ocr.date ?? toIsoDateString(),
    items: ocrItemsToFormItems(ocr),
  };
}

export function countOcrFilledFields(ocr: ReceiptOcrResult | null): number {
  if (!ocr) return 0;

  let count = 0;
  if (ocr.merchantName) count++;
  if (ocr.totalAmount !== undefined && ocr.totalAmount > 0) count++;
  if (ocr.date) count++;
  if (ocr.suggestedCategory) count++;
  return count;
}

export function formValuesToConfirmation(
  values: ReceiptFormValues,
  amount: number,
): ReceiptConfirmationInput {
  return {
    type: values.type,
    merchantName: values.merchantName.trim(),
    amount,
    category: values.category,
    description: values.description.trim() || undefined,
    date: values.date,
  };
}

/** Campo ainda igual ao valor original do OCR */
export function isOcrFieldUnchanged(
  field: keyof ReceiptFormValues,
  current: ReceiptFormValues,
  ocr: ReceiptOcrResult | null,
): boolean {
  if (!ocr) return false;

  const original = ocrToFormValues(ocr);

  switch (field) {
    case 'merchantName':
      return current.merchantName === original.merchantName && original.merchantName !== '';
    case 'amount':
      return current.amount === original.amount && original.amount !== '';
    case 'date':
      return current.date === original.date && original.date !== '';
    case 'category':
      return current.category === original.category && original.category !== '';
    case 'description':
      return current.description === original.description && original.description !== '';
    default:
      return false;
  }
}
