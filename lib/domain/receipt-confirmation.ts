import type {
  ReceiptConfirmationInput,
  ReceiptFormValues,
  ReceiptOcrResult,
} from './receipt.types';
import { toIsoDateString } from '@/lib/utils/format';

export function ocrToFormValues(ocr: ReceiptOcrResult | null): ReceiptFormValues {
  return {
    type: 'expense',
    merchantName: ocr?.merchantName ?? '',
    amount: ocr?.totalAmount !== undefined ? String(ocr.totalAmount) : '',
    category: ocr?.suggestedCategory ?? '',
    description: ocr?.merchantName ?? '',
    date: ocr?.date ?? toIsoDateString(),
  };
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
