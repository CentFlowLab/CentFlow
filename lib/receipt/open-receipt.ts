import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import type { Transaction } from '@/lib/domain/transaction.types';
import { getReceiptSignedUrl } from '@/lib/supabase/receipts';

function isHttpUrl(uri?: string | null): uri is string {
  return Boolean(uri && /^https?:/i.test(uri));
}

/**
 * Abre a fatura/talão de um movimento.
 * Prioridade: URL remota → URL assinada (via receiptId) → ficheiro local (partilha).
 * Devolve `true` se conseguiu abrir/partilhar.
 */
export async function openReceiptForTransaction(transaction: Transaction): Promise<boolean> {
  let target: string | null = isHttpUrl(transaction.receiptUrl)
    ? transaction.receiptUrl
    : isHttpUrl(transaction.receiptImage)
      ? transaction.receiptImage
      : null;

  if (!target && transaction.receiptId) {
    try {
      target = await getReceiptSignedUrl(transaction.receiptId);
    } catch {
      target = null;
    }
  }

  if (target) {
    await WebBrowser.openBrowserAsync(target);
    return true;
  }

  // Ficheiro local (mock/offline) — partilha/abre com o sistema.
  if (transaction.receiptImage) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(transaction.receiptImage);
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}
