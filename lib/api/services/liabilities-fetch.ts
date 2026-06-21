import { authService } from '@/lib/auth';
import { fetchLiabilitiesForUser } from '@/lib/liabilities/liabilities.service';
import type { Credit } from '@/lib/domain/types';

/**
 * Créditos do utilizador autenticado.
 * Em caso de falha devolve [] para não bloquear o dashboard, mas regista o erro
 * (capturado pelo Doctor) — caso contrário o património líquido apareceria
 * inflacionado sem qualquer sinal de que os passivos não foram carregados.
 */
export async function fetchCreditsForCurrentUser(): Promise<Credit[]> {
  try {
    const user = await authService.getCurrentUser();
    const liabilities = await fetchLiabilitiesForUser(user.id);
    return liabilities.credits;
  } catch (error) {
    console.warn('[liabilities] Falha ao carregar créditos do utilizador.', error);
    return [];
  }
}
