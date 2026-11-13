import type { SupabaseClient } from '@supabase/supabase-js';

import { appStorage, type KeyValueStore } from '@/lib/storage/key-value-store';

/**
 * Onboarding por conta (ADR-067). A fonte de verdade é o perfil no servidor
 * (`profiles.onboarding_completed_at`); aqui fica só uma cópia por conta, para funcionar sem rede
 * e não piscar o onboarding enquanto o perfil carrega. Nada é partilhado entre contas.
 */
const doneKey = (userId: string) => `onboarding:done:${userId}`;
const pendingKey = (userId: string) => `onboarding:pending:${userId}`;

export type OnboardingInput = {
  /** Cópia local desta conta (concluído aqui ou confirmado pelo servidor antes). */
  cachedDone: boolean;
  /** Servidor: `true`/`false`, ou `null` se ainda não se sabe (a carregar, sem rede, erro). */
  serverDone: boolean | null;
  /** A base de dados local desta conta já tem contas (dados reais). */
  hasData: boolean;
  /** Este aparelho já sincronizou com o servidor pelo menos uma vez. */
  syncedOnce: boolean;
};

export type OnboardingDecision = 'done' | 'needed' | 'unknown';

/**
 * Só mostra o onboarding quando há certeza: o servidor diz que não foi concluído **e** os dados
 * desta conta já foram descarregados e estão vazios. Na dúvida (a carregar, sem rede), não mostra.
 * Uma conta com dados é tratada como configurada (contas antigas não repetem o onboarding).
 */
export function decideOnboarding(input: OnboardingInput): OnboardingDecision {
  if (input.cachedDone || input.serverDone === true || input.hasData) return 'done';
  if (input.serverDone === false && input.syncedOnce) return 'needed';
  return 'unknown';
}

export async function cachedOnboardingDone(
  userId: string,
  storage: KeyValueStore = appStorage,
): Promise<boolean> {
  try {
    return (await storage.getItem(doneKey(userId))) === '1';
  } catch {
    return false;
  }
}

/** Lê o estado no servidor (RLS: só o próprio perfil). `null` se não for possível saber. */
export async function fetchServerOnboarding(client: SupabaseClient): Promise<boolean | null> {
  try {
    const { data, error } = await client
      .from('profiles')
      .select('onboarding_completed_at')
      .maybeSingle();
    if (error || !data) return null;
    return (data as { onboarding_completed_at: string | null }).onboarding_completed_at !== null;
  } catch {
    return null;
  }
}

/**
 * Marca a conclusão no servidor. Sem confirmação (sem rede, erro), fica pendente e é repetida
 * depois; neste aparelho a conta já não volta a ver o onboarding.
 */
export async function completeOnboarding(
  client: SupabaseClient | null,
  userId: string,
  storage: KeyValueStore = appStorage,
): Promise<'confirmed' | 'pending'> {
  await storage.setItem(doneKey(userId), '1').catch(() => undefined);
  if (client) {
    try {
      const { error } = await client.rpc('complete_onboarding');
      if (!error) {
        await storage.removeItem(pendingKey(userId)).catch(() => undefined);
        return 'confirmed';
      }
    } catch {
      // Sem rede: fica pendente.
    }
  }
  await storage.setItem(pendingKey(userId), '1').catch(() => undefined);
  console.warn('[onboarding] completion_pending');
  return 'pending';
}

/** O servidor disse que esta conta já concluiu: guarda a cópia e esquece pendentes. */
export async function markOnboardingConfirmed(
  userId: string,
  storage: KeyValueStore = appStorage,
): Promise<void> {
  await storage.setItem(doneKey(userId), '1').catch(() => undefined);
  await storage.removeItem(pendingKey(userId)).catch(() => undefined);
}

export async function hasPendingCompletion(
  userId: string,
  storage: KeyValueStore = appStorage,
): Promise<boolean> {
  try {
    return (await storage.getItem(pendingKey(userId))) === '1';
  } catch {
    return false;
  }
}

/** Conta eliminada: esquece as marcas desta conta neste aparelho. */
export async function forgetOnboarding(
  userId: string,
  storage: KeyValueStore = appStorage,
): Promise<void> {
  await storage.removeItem(doneKey(userId)).catch(() => undefined);
  await storage.removeItem(pendingKey(userId)).catch(() => undefined);
}

/** "Mais tarde" nesta sessão: não insiste até à próxima abertura da app (retoma depois). */
const skippedThisSession = new Set<string>();
export const skipOnboardingForSession = (userId: string) => skippedThisSession.add(userId);
export const skippedOnboardingThisSession = (userId: string) => skippedThisSession.has(userId);

/**
 * Sem servidor configurado (desenvolvimento local e testes), não há conta: vale a marca deste
 * aparelho, como antes do ADR-067.
 */
const DEVICE_KEY = 'onboarding:seen';

export async function hasSeenOnboarding(storage: KeyValueStore = appStorage): Promise<boolean> {
  try {
    return (await storage.getItem(DEVICE_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(storage: KeyValueStore = appStorage): Promise<void> {
  await storage.setItem(DEVICE_KEY, '1').catch(() => undefined);
}

/**
 * O onboarding abre no máximo uma vez por abertura da app e por conta. Sem servidor (`local`),
 * a marca do aparelho já evita repetições.
 */
const openedThisSession = new Set<string>();
export const markOnboardingOpened = (key: string) => {
  if (key !== 'local') openedThisSession.add(key);
};
export const onboardingOpenedThisSession = (key: string) => openedThisSession.has(key);
