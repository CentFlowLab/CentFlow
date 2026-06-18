import { authService } from '@/lib/auth';
import { fetchLiabilitiesForUser } from '@/lib/liabilities/liabilities.service';
import type { Credit } from '@/lib/domain/types';

/** Créditos do utilizador autenticado (vazio se sessão indisponível). */
export async function fetchCreditsForCurrentUser(): Promise<Credit[]> {
  try {
    const user = await authService.getCurrentUser();
    const liabilities = await fetchLiabilitiesForUser(user.id);
    return liabilities.credits;
  } catch {
    return [];
  }
}
