export type MerchantSuggestionPayload = {
  movementId: string;
  description: string;
  amount: number;
  date: string;
  currency?: string;
};

type Listener = (payload: MerchantSuggestionPayload) => void;

const listeners = new Set<Listener>();

/** Publica verificação de agrupamento após guardar movimento (1–2s depois no gate). */
export function publishMerchantSuggestionCheck(payload: MerchantSuggestionPayload): void {
  for (const listener of listeners) {
    listener(payload);
  }
}

export function subscribeMerchantSuggestionCheck(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
