/**
 * Traduz erros técnicos do Open Banking / Edge Functions para mensagens de produto.
 * Detalhes técnicos ficam nos logs (logAppError) — nunca na UI de produção.
 */

const TECHNICAL_PATTERNS: Array<{ match: RegExp; message: string }> = [
  {
    match: /Edge Function returned a non-2xx/i,
    message:
      'Não foi possível ligar ao serviço bancário. Tenta novamente dentro de alguns minutos.',
  },
  {
    match: /Failed to send a request to the Edge Function/i,
    message: 'Não foi possível contactar o serviço bancário. Verifica a ligação e tenta novamente.',
  },
  {
    match: /FunctionsFetchError|FunctionsHttpError|FunctionsRelayError/i,
    message: 'O serviço bancário está temporariamente indisponível. Tenta mais tarde.',
  },
  {
    match: /network request failed|timeout|timed out/i,
    message: 'A ligação demorou demasiado. Tenta novamente.',
  },
];

export function getOpenBankingUserMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Falha Open Banking';

  for (const entry of TECHNICAL_PATTERNS) {
    if (entry.match.test(raw)) return entry.message;
  }

  // Mensagens já em PT e curtas — manter; genéricos técnicos — substituir.
  if (/^[A-Za-z0-9_:\-.\s]{0,80}$/.test(raw) && /error|failed|exception|status/i.test(raw)) {
    return 'Não foi possível concluir a operação bancária. Tenta novamente.';
  }

  return raw.length > 160
    ? 'Não foi possível concluir a operação bancária. Tenta novamente.'
    : raw;
}
