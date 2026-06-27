import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCreateTransaction } from '@/hooks/queries/useTransactions';
import { useAuth } from '@/lib/auth';
import { traceQuickExpenseLink } from '@/lib/doctor/quick-expense-link-trace';
import {
  mapCategoryKey,
  parseQuickExpenseUrl,
  type QuickExpenseParams,
} from '@/lib/quick-expense/handle-quick-expense-link';
import { formatCurrency, todayInputDate } from '@/lib/utils/format';

function isQuickExpenseUrl(url: string): boolean {
  return url.includes('quick-expense');
}

function hasParam(url: string, key: string): boolean {
  return new RegExp(`[?&]${key}=`, 'i').test(url);
}

/**
 * Recebe `centflow://quick-expense?amount=...&category=...&note=...`, guarda a
 * despesa automaticamente e mostra um toast — sem mostrar qualquer formulário.
 *
 * - Foreground e cold start (via getInitialURL).
 * - Se o utilizador não estiver autenticado, guarda os parâmetros em memória e
 *   grava assim que a sessão ficar disponível.
 * - URLs sem parâmetros válidos (`centflow://quick-expense`) são ignorados aqui
 *   e tratados pela rota (abre o formulário de Gasto rápido).
 */
export function QuickExpenseLinkHandler() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const createMutation = useCreateTransaction();

  const isAuthenticatedRef = useRef(isAuthenticated);
  const pendingRef = useRef<QuickExpenseParams | null>(null);
  const lastUrlRef = useRef<{ url: string; at: number } | null>(null);
  const savingRef = useRef(false);

  const mutateAsync = createMutation.mutateAsync;

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const save = useCallback(
    async (params: QuickExpenseParams) => {
      if (savingRef.current) return;
      savingRef.current = true;
      traceQuickExpenseLink('save_start', {
        amount: params.amount,
        category: params.category,
      });
      try {
        await mutateAsync({
          type: 'expense',
          amount: params.amount,
          category: mapCategoryKey(params.category),
          description: params.note,
          date: todayInputDate(),
        });
        traceQuickExpenseLink('save_success', {
          amount: params.amount,
          category: params.category,
        });
        showToast(`\u2212${formatCurrency(params.amount)} guardado`, 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        traceQuickExpenseLink('save_error', { error: message });
        showToast('Não foi possível guardar. Tenta novamente.', 'error');
      } finally {
        savingRef.current = false;
      }
    },
    [mutateAsync, showToast],
  );

  const handleUrl = useCallback(
    (url: string | null) => {
      if (!url || !isQuickExpenseUrl(url)) return;

      // Evita duplo processamento (getInitialURL + evento 'url' no cold start).
      const now = Date.now();
      if (lastUrlRef.current && lastUrlRef.current.url === url && now - lastUrlRef.current.at < 1500) {
        return;
      }
      lastUrlRef.current = { url, at: now };

      traceQuickExpenseLink('link_received', {
        hasAmount: hasParam(url, 'amount'),
        hasCategory: hasParam(url, 'category'),
        hasNote: hasParam(url, 'note'),
      });

      const params = parseQuickExpenseUrl(url);
      if (!params) {
        // Sem parâmetros (abertura simples) → a rota mostra o formulário.
        if (hasParam(url, 'amount')) {
          traceQuickExpenseLink('parse_failed', { error: 'amount inválido ou ausente' });
        }
        return;
      }

      traceQuickExpenseLink('parse_success', {
        amount: params.amount,
        category: params.category,
      });

      if (!isAuthenticatedRef.current) {
        pendingRef.current = params;
        return;
      }

      void save(params);
    },
    [save],
  );

  useEffect(() => {
    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, [handleUrl]);

  // Grava parâmetros pendentes assim que a sessão fica disponível (cold start sem login).
  useEffect(() => {
    if (isAuthenticated && pendingRef.current) {
      const params = pendingRef.current;
      pendingRef.current = null;
      void save(params);
    }
  }, [isAuthenticated, save]);

  return null;
}
