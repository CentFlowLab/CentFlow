import type {
  ReceiptConfirmationInput,
  ReceiptConfirmedItem,
  ReceiptFormItem,
  ReceiptFormValues,
  ReceiptOcrResult,
} from './receipt.types';
import { receiptConfirmedItemsSchema } from './receipt-items.schema';
import { formatInputDate, inputDateToIso, todayInputDate, toIsoDateString } from '@/lib/utils/format';

function createItemId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

function parseItemAmount(value: string): number | null {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseOptionalNumber(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
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
    date: todayInputDate(),
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
    quantity: item.quantity !== undefined ? String(item.quantity) : undefined,
    unitPrice: item.unitPrice !== undefined ? String(item.unitPrice) : undefined,
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
    date: formatInputDate(ocr.date ?? toIsoDateString()),
    items: ocrItemsToFormItems(ocr),
  };
}

/** Converte linhas do formulário para itens confirmados (filtra vazios) */
export function formItemsToConfirmedItems(
  items: ReceiptFormItem[],
  defaultCategory?: string,
): ReceiptConfirmedItem[] {
  const confirmed: ReceiptConfirmedItem[] = [];

  for (const [index, item] of items.entries()) {
    const name = item.name.trim();
    const totalPrice = parseItemAmount(item.amount);
    if (!name || totalPrice === null) continue;

    const quantity = parseOptionalNumber(item.quantity);
    const unitPrice = parseOptionalNumber(item.unitPrice);

    confirmed.push({
      id: item.id || createItemId('item', index),
      name,
      quantity,
      unitPrice,
      totalPrice,
      category: defaultCategory,
    });
  }

  const parsed = receiptConfirmedItemsSchema.safeParse(
    confirmed.map(({ id: _id, ...rest }) => rest),
  );

  if (!parsed.success) {
    return confirmed.filter((item) => item.name && item.totalPrice > 0);
  }

  return confirmed;
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
  const items = formItemsToConfirmedItems(values.items, values.category);

  return {
    type: values.type,
    merchantName: values.merchantName.trim(),
    amount,
    category: values.category,
    description: values.description.trim() || undefined,
    date: inputDateToIso(values.date) ?? values.date,
    items,
  };
}

function ocrFieldHadValue(field: keyof ReceiptFormValues, ocr: ReceiptOcrResult): boolean {
  const original = ocrToFormValues(ocr);
  switch (field) {
    case 'merchantName':
      return original.merchantName !== '';
    case 'amount':
      return original.amount !== '';
    case 'date':
      return original.date !== '';
    case 'category':
      return original.category !== '';
    case 'description':
      return original.description !== '';
    default:
      return false;
  }
}

/** Campo veio do OCR mas foi alterado pelo utilizador */
export function wasOcrFieldEdited(
  field: keyof ReceiptFormValues,
  current: ReceiptFormValues,
  ocr: ReceiptOcrResult | null,
): boolean {
  if (!ocr) return false;
  if (!ocrFieldHadValue(field, ocr)) return false;
  return !isOcrFieldUnchanged(field, current, ocr);
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
      return (
        (inputDateToIso(current.date) ?? current.date) ===
          (inputDateToIso(original.date) ?? original.date) &&
        original.date !== ''
      );
    case 'category':
      return current.category === original.category && original.category !== '';
    case 'description':
      return current.description === original.description && original.description !== '';
    default:
      return false;
  }
}
