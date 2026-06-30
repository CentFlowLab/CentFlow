import { authService } from '@/lib/auth';
import { logAppEvent } from '@/lib/diagnostics';
import { fetchLiabilitiesForUser } from '@/lib/liabilities/liabilities.service';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Credit } from '@/lib/domain/types';

export type LiabilitiesFetchResult = {
  credits: Credit[];
  subscriptions: Subscription[];
  loadFailed: boolean;
};

/**
 * Passivos do utilizador autenticado para o ecrã Início.
 * Em caso de falha devolve listas vazias e loadFailed=true — o património
 * líquido pode aparecer inflacionado; a Home mostra um aviso nesse caso.
 */
export async function fetchLiabilitiesForHome(): Promise<LiabilitiesFetchResult> {
  try {
    const user = await authService.getCurrentUser();
    const liabilities = await fetchLiabilitiesForUser(user.id);
    return {
      credits: liabilities.credits,
      subscriptions: liabilities.subscriptions,
      loadFailed: false,
    };
  } catch (error) {
    logAppEvent('warn', 'liabilities-fetch', 'Falha ao carregar passivos do utilizador.');
    return { credits: [], subscriptions: [], loadFailed: true };
  }
}

/** @deprecated Preferir fetchLiabilitiesForHome() para distinguir falhas de carga. */
export async function fetchCreditsForCurrentUser(): Promise<Credit[]> {
  const { credits } = await fetchLiabilitiesForHome();
  return credits;
}
