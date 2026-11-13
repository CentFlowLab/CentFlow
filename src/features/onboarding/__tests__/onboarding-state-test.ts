import type { SupabaseClient } from '@supabase/supabase-js';

import { createMemoryStore } from '@/lib/storage/key-value-store';

import {
  cachedOnboardingDone,
  completeOnboarding,
  decideOnboarding,
  fetchServerOnboarding,
  hasPendingCompletion,
} from '../onboarding-state';

const base = { cachedDone: false, serverDone: null, hasData: false, syncedOnce: false };

describe('decideOnboarding (ADR-067)', () => {
  it('shows it to a brand-new account only once the server and the first sync agree', () => {
    // 1. Conta nova, perfil e dados confirmados vazios → onboarding.
    expect(decideOnboarding({ ...base, serverDone: false, syncedOnce: true })).toBe('needed');
    // 8. Perfil ainda a carregar ou primeira sincronização por fazer → espera, não mostra.
    expect(decideOnboarding({ ...base })).toBe('unknown');
    expect(decideOnboarding({ ...base, serverDone: false })).toBe('unknown');
    expect(decideOnboarding({ ...base, syncedOnce: true })).toBe('unknown');
  });

  it('never shows it again once the account completed it, on any device', () => {
    // 3–6. Logout, novo login, outro aparelho, reinstalação: vale o servidor.
    expect(decideOnboarding({ ...base, serverDone: true })).toBe('done');
    expect(decideOnboarding({ ...base, serverDone: true, syncedOnce: true })).toBe('done');
    // Sem rede, mas concluído antes neste aparelho por esta conta.
    expect(decideOnboarding({ ...base, cachedDone: true })).toBe('done');
    // 12. Conta antiga com dados (servidor sem a marca): não repete.
    expect(decideOnboarding({ ...base, serverDone: false, syncedOnce: true, hasData: true })).toBe(
      'done',
    );
  });
});

describe('completion storage', () => {
  const client = (rpcError: unknown, profile: unknown = null) =>
    ({
      rpc: jest.fn(async () => ({ error: rpcError })),
      from: () => ({
        select: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }),
      }),
    }) as unknown as SupabaseClient;

  it('confirms on the server and keeps the copy per account', async () => {
    const storage = createMemoryStore();
    expect(await completeOnboarding(client(null), 'user-a', storage)).toBe('confirmed');
    expect(await cachedOnboardingDone('user-a', storage)).toBe(true);
    expect(await hasPendingCompletion('user-a', storage)).toBe(false);
    // 11. Outra conta no mesmo aparelho não herda a conclusão.
    expect(await cachedOnboardingDone('user-b', storage)).toBe(false);
  });

  it('keeps it pending without a network instead of claiming it was saved', async () => {
    // 9. Erro de rede: fica pendente (não é declarado como gravado no servidor).
    const storage = createMemoryStore();
    expect(await completeOnboarding(client({ message: 'offline' }), 'user-a', storage)).toBe(
      'pending',
    );
    expect(await hasPendingCompletion('user-a', storage)).toBe(true);
    expect(await completeOnboarding(null, 'user-a', storage)).toBe('pending');
  });

  it('reads the server state, and unknown when it cannot', async () => {
    expect(await fetchServerOnboarding(client(null, { onboarding_completed_at: null }))).toBe(
      false,
    );
    expect(
      await fetchServerOnboarding(
        client(null, { onboarding_completed_at: '2026-11-12T10:00:00Z' }),
      ),
    ).toBe(true);
    expect(await fetchServerOnboarding(client(null, null))).toBeNull();
  });
});
