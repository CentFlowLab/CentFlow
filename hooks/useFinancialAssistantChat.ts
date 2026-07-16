import { useCallback, useMemo, useState } from 'react';

import { useCashflowProjection } from '@/hooks/useCashflowProjection';
import { useFinancialCalendar } from '@/hooks/useFinancialCalendar';
import { useFinancialRecommendations } from '@/hooks/useFinancialRecommendations';
import { useFinancialState } from '@/hooks/useFinancialState';
import { useGoalContributions } from '@/hooks/queries/useGoalContributions';
import { useLoanPayments } from '@/hooks/queries/useLoanPayments';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useAssets } from '@/hooks/queries/useAssets';
import {
  buildAssistantMotorSnapshot,
  type AssistantMotorSnapshot,
  type AssistantQueryResult,
} from '@/lib/domain/financial/assistant-chat';
import {
  buildMotorQueryResult,
  classifyAssistantIntentLocally,
} from '@/lib/domain/financial/assistant-chat.client';
import {
  askFinancialAssistant,
  fetchAssistantMessages,
  type AssistantMessage,
  type FinancialAssistantResponse,
} from '@/lib/supabase/financial-assistant';
import { getScreenErrorContent } from '@/lib/api/errors';

export function useFinancialAssistantChat() {
  const { state, isLoading: stateLoading } = useFinancialState();
  const { data: transactions = [] } = useTransactions('all');
  const { data: assets } = useAssets();
  const { data: goalContributions = [] } = useGoalContributions();
  const { data: loanPayments = [] } = useLoanPayments();
  const { data: preferences } = useUserPreferences();
  const { projection } = useCashflowProjection(30);
  const { calendar } = useFinancialCalendar({ horizonDays: 30 });
  const recommendations = useFinancialRecommendations();

  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshot: AssistantMotorSnapshot | null = useMemo(() => {
    if (!state) return null;
    return buildAssistantMotorSnapshot({
      state,
      transactions,
      calendar,
      projection,
      recommendations,
    });
  }, [state, transactions, calendar, projection, recommendations]);

  const simulationContext = useMemo(() => {
    if (!state) return null;
    return {
      transactions,
      goalContributions,
      loanPayments,
      goals: assets?.goals,
      prioritizeDebtAmortization: preferences?.prioritizeDebtAmortization ?? true,
    };
  }, [
    assets?.goals,
    goalContributions,
    loanPayments,
    preferences?.prioritizeDebtAmortization,
    state,
    transactions,
  ]);

  const isReady = Boolean(snapshot && state && !stateLoading);

  const sendMessage = useCallback(
    async (message: string): Promise<FinancialAssistantResponse | null> => {
      if (!snapshot || !state) return null;

      setIsSending(true);
      setError(null);

      const userMessage: AssistantMessage = {
        id: `local-user-${Date.now()}`,
        role: 'user',
        content: message,
      };
      setMessages((current) => [...current, userMessage]);

      try {
        const classification = classifyAssistantIntentLocally(message);
        const motorQueryResult: AssistantQueryResult = buildMotorQueryResult({
          classification,
          snapshot,
          simulation: simulationContext
            ? { state, context: simulationContext }
            : undefined,
        });

        const response = await askFinancialAssistant({
          message,
          conversationId,
          snapshot,
          motorQueryResult,
        });

        setConversationId(response.conversationId);

        const assistantMessage: AssistantMessage = {
          id: `local-assistant-${Date.now()}`,
          role: 'assistant',
          content: response.answer,
          intent: response.intent,
        };
        setMessages((current) => [...current, assistantMessage]);

        return response;
      } catch (err) {
        const messageText = getScreenErrorContent(err, 'generic').description;
        setError(messageText);
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, simulationContext, snapshot, state],
  );

  const loadConversation = useCallback(async (id: string) => {
    const rows = await fetchAssistantMessages(id);
    setConversationId(id);
    setMessages(rows);
  }, []);

  const resetConversation = useCallback(() => {
    setConversationId(undefined);
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    isSending,
    isReady,
    error,
    conversationId,
    loadConversation,
    resetConversation,
  };
}
