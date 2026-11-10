/**
 * Erros que acontecem antes de o monitor de erros estar carregado (web, ADR-047). Ficam numa fila
 * curta e são enviados quando ele chega; a partir daí, o próprio Sentry apanha os erros globais.
 */
export const EARLY_ERROR_LIMIT = 20;

export type EarlyErrorBuffer = {
  /** Guarda um erro enquanto não há monitor; devolve `false` se a fila já estiver cheia. */
  push(error: unknown): boolean;
  /** Envia tudo o que está na fila e passa a enviar logo (não volta a guardar). */
  flush(capture: (error: unknown) => void): void;
  readonly size: number;
};

export function createEarlyErrorBuffer(limit = EARLY_ERROR_LIMIT): EarlyErrorBuffer {
  let queue: unknown[] = [];
  let sink: ((error: unknown) => void) | null = null;
  return {
    push(error) {
      if (sink) {
        sink(error);
        return true;
      }
      if (queue.length >= limit) return false;
      queue.push(error);
      return true;
    },
    flush(capture) {
      sink = capture;
      const pending = queue;
      queue = [];
      for (const error of pending) capture(error);
    },
    get size() {
      return queue.length;
    },
  };
}
