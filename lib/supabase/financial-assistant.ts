import { isMockAuthEnabled } from '@/lib/auth';
import type { FinancialAssistantResponse } from '@/lib/domain/financial/assistant-chat.client';
import type { AssistantMotorSnapshot, AssistantQueryResult } from '@/lib/domain/financial/assistant-chat';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

export type AskFinancialAssistantInput = {
  message: string;
  conversationId?: string;
  snapshot: AssistantMotorSnapshot;
  motorQueryResult?: AssistantQueryResult;
};

export async function askFinancialAssistant(
  input: AskFinancialAssistantInput,
): Promise<FinancialAssistantResponse> {
  if (isMockAuthEnabled()) {
    return {
      conversationId: input.conversationId ?? 'mock-conversation',
      intent: input.motorQueryResult?.intent ?? 'unsupported',
      supported: input.motorQueryResult?.supported ?? false,
      answer: input.motorQueryResult?.headline ?? 'Assistente em modo mock.',
      facts: input.motorQueryResult?.facts ?? {},
      headline: input.motorQueryResult?.headline ?? '',
    };
  }

  if (!isSupabaseEnabled()) {
    throw new Error('Assistente indisponível sem Supabase.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('financial-assistant', {
    body: {
      message: input.message,
      conversationId: input.conversationId,
      snapshot: input.snapshot,
      motorQueryResult: input.motorQueryResult,
    },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao contactar o assistente.');
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as FinancialAssistantResponse;
}

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string | null;
};

export async function fetchAssistantMessages(conversationId: string): Promise<AssistantMessage[]> {
  if (!isSupabaseEnabled()) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('assistant_messages')
    .select('id, role, content, intent')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AssistantMessage[];
}
