import type {
  AssistantIntentClassification,
  AssistantIntentParams,
  AssistantMotorSnapshot,
  AssistantQueryResult,
  AssistantSimulationContext,
  AssistantSupportedIntent,
} from '@/lib/domain/financial/assistant-chat';
import {
  ASSISTANT_SUPPORTED_INTENTS,
  executeAssistantQuery,
} from '@/lib/domain/financial/assistant-chat';
import type { FinancialState } from '@/lib/domain/financial/financial-state.types';

/** Classificação heurística local para pré-calcular query com motor antes da Edge Function. */
export function classifyAssistantIntentLocally(message: string): AssistantIntentClassification {
  const normalized = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const amountMatch = normalized.match(/(\d+[.,]?\d*)\s*€?/);
  let amount = amountMatch ? Number.parseFloat(amountMatch[1].replace(',', '.')) : undefined;

  if (/metade|half/.test(normalized) && amount) {
    amount = amount / 2;
  }

  const params: AssistantIntentParams = { amount };

  if (
    /quanto posso gastar|gasto diario|gasto seguro|gastar hoje|disponivel hoje/.test(normalized)
  ) {
    return { intent: 'daily_spend_limit', confidence: 'high', params };
  }

  if (
    /posso comprar|posso gastar|comprar|gastar \d|fazer esta compra|compra de/.test(normalized) ||
    (amount && /posso|compro|comprar/.test(normalized))
  ) {
    return { intent: 'can_i_buy', confidence: amount ? 'high' : 'medium', params };
  }

  if (
    /quando fico sem|sem margem|saldo negativo|fico a negativo|correr mal/.test(normalized)
  ) {
    return { intent: 'when_runs_out', confidence: 'high', params };
  }

  if (
    /divida ou poupar|pagar divida|amortizar|poupar para|devo pagar/.test(normalized)
  ) {
    return { intent: 'debt_vs_save', confidence: 'high', params };
  }

  if (
    /como estou|resumo|este mes|situacao financeira|orcamento/.test(normalized)
  ) {
    return { intent: 'monthly_overview', confidence: 'high', params };
  }

  return { intent: 'unsupported', confidence: 'low', params };
}

export function buildMotorQueryResult(input: {
  classification: AssistantIntentClassification;
  snapshot: AssistantMotorSnapshot;
  simulation?: {
    state: FinancialState;
    context: AssistantSimulationContext;
  };
}): AssistantQueryResult {
  if (!ASSISTANT_SUPPORTED_INTENTS.includes(input.classification.intent)) {
    return executeAssistantQuery('unsupported', {}, input.snapshot);
  }

  return executeAssistantQuery(
    input.classification.intent,
    input.classification.params,
    input.snapshot,
    input.simulation,
  );
}

export type FinancialAssistantResponse = {
  conversationId: string;
  intent: AssistantSupportedIntent | 'unsupported';
  supported: boolean;
  answer: string;
  facts: Record<string, string | number | boolean | null>;
  headline: string;
};
