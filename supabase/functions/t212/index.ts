// Trading 212 (ADR-064): ligação só de leitura à API pública oficial (docs.trading212.com).
// - A chave e o segredo da API nunca voltam à app: ficam cifrados (AES-GCM) em
//   private.integration_secrets com INTEGRATIONS_KEY (segredo desta função, 32 bytes em base64).
// - Só pedidos GET ao resumo e às posições; um pedido por conta a cada 10 s no máximo.
// - Nunca guarda nem regista a resposta em bruto, nomes ou valores; só códigos de erro.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { deleteAccountCorsHeaders } from '../../../src/core/account/delete-account-policy.ts';
import {
  basicAuth,
  canRefresh,
  errorFromStatus,
  parseT212,
  T212_HOSTS,
  validCredentials,
  type T212Environment,
  type T212ErrorCode,
} from '../../../src/core/investments/trading212.ts';

const PROVIDER = 'trading212';

function extraOrigins(): string[] {
  return (Deno.env.get('ALLOWED_WEB_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function cryptoKey(): Promise<CryptoKey | null> {
  const raw = Deno.env.get('INTEGRATIONS_KEY');
  if (!raw) return null;
  const bytes = unb64(raw);
  if (bytes.length !== 32) return null;
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function seal(key: CryptoKey, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value),
  );
  return { iv: b64(iv), ciphertext: b64(new Uint8Array(data)) };
}

async function open(key: CryptoKey, iv: string, ciphertext: string): Promise<string> {
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(iv) },
    key,
    unb64(ciphertext),
  );
  return new TextDecoder().decode(data);
}

type Credentials = { apiKey: string; apiSecret: string; environment: T212Environment };

/** Resumo e posições, por esta ordem (limites: 1/5 s e 1/s). */
async function fetchAccount(credentials: Credentials) {
  const host = T212_HOSTS[credentials.environment];
  const headers = { Authorization: basicAuth(credentials.apiKey, credentials.apiSecret) };
  let summaryBody: unknown;
  let positionsBody: unknown;
  try {
    // Sem resposta em 15 s, a Trading 212 está indisponível (nunca fica à espera para sempre).
    const summary = await fetch(`${host}/api/v0/equity/account/summary`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (!summary.ok) return { ok: false as const, error: errorFromStatus(summary.status) };
    const positions = await fetch(`${host}/api/v0/equity/positions`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (!positions.ok) return { ok: false as const, error: errorFromStatus(positions.status) };
    try {
      summaryBody = await summary.json();
      positionsBody = await positions.json();
    } catch {
      return { ok: false as const, error: 'invalid' as const };
    }
  } catch {
    return { ok: false as const, error: 'unavailable' as const };
  }
  const parsed = parseT212(summaryBody, positionsBody, new Date().toISOString());
  return parsed.ok
    ? { ok: true as const, snapshot: parsed.snapshot }
    : { ok: false as const, error: 'invalid' as const };
}

Deno.serve(async (req) => {
  const headers = deleteAccountCorsHeaders(req.headers.get('Origin'), extraOrigins());
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const publishable = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const key = await cryptoKey();
  if (!url || !publishable || !secret || !key) return json({ error: 'misconfigured' }, 500);

  const caller = createClient(url, publishable, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await caller.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  // A chave administrativa só escreve linhas desta pessoa (user.id vem da sessão verificada).
  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;

  const saveResult = async (
    environment: T212Environment,
    result: Awaited<ReturnType<typeof fetchAccount>>,
  ) => {
    const now = new Date().toISOString();
    const state = await admin.from('integrations').upsert({
      user_id: user.id,
      provider: PROVIDER,
      environment,
      status: result.ok ? 'connected' : 'error',
      last_sync_at: now,
      last_error: result.ok ? null : result.error,
      updated_at: now,
    });
    if (state.error) return false;
    if (result.ok) {
      const snapshot = await admin.from('investment_snapshots').upsert({
        user_id: user.id,
        provider: PROVIDER,
        taken_at: result.snapshot.takenAt,
        currency: result.snapshot.currency,
        total: result.snapshot.total,
        data: result.snapshot,
      });
      if (snapshot.error) return false;
    }
    return true;
  };

  /** Último pedido desta pessoa (connect e refresh partilham o intervalo mínimo). */
  const current = async () =>
    (
      await admin
        .from('integrations')
        .select('environment, last_sync_at')
        .eq('user_id', user.id)
        .eq('provider', PROVIDER)
        .maybeSingle()
    ).data as { environment: T212Environment; last_sync_at: string | null } | null;

  if (action === 'connect') {
    const credentials = validCredentials(body ?? {});
    if (!credentials) return json({ error: 'invalid' }, 400);
    const existing = await current();
    if (existing && !canRefresh(existing.last_sync_at, Date.now())) {
      return json({ error: 'rateLimited' satisfies T212ErrorCode }, 429);
    }
    // Só guarda depois de a Trading 212 aceitar as credenciais.
    const result = await fetchAccount(credentials);
    if (!result.ok) return json({ error: result.error satisfies T212ErrorCode }, 400);
    const sealed = await seal(key, JSON.stringify(credentials));
    const stored = await admin.rpc('integration_secret_put', {
      p_user: user.id,
      p_provider: PROVIDER,
      p_iv: sealed.iv,
      p_ciphertext: sealed.ciphertext,
    });
    // Sem a chave guardada, a ligação não fica marcada como feita.
    if (stored.error) return json({ error: 'unavailable' }, 500);
    if (!(await saveResult(credentials.environment, result))) {
      return json({ error: 'unavailable' }, 500);
    }
    return json({ ok: true });
  }

  if (action === 'refresh') {
    const integration = await current();
    if (!integration) return json({ error: 'notConnected' }, 404);
    if (!canRefresh(integration.last_sync_at, Date.now())) {
      return json({ ok: true, throttled: true });
    }
    const { data: rows } = await admin.rpc('integration_secret_get', {
      p_user: user.id,
      p_provider: PROVIDER,
    });
    const stored = (rows as { iv: string; ciphertext: string }[] | null)?.[0];
    if (!stored) return json({ error: 'notConnected' }, 404);
    let credentials: Credentials;
    try {
      credentials = JSON.parse(await open(key, stored.iv, stored.ciphertext)) as Credentials;
    } catch {
      // Chave de cifra mudada ou dados danificados: é preciso ligar a conta outra vez.
      await saveResult(integration.environment, { ok: false, error: 'unauthorized' });
      return json({ error: 'unauthorized' }, 409);
    }
    const result = await fetchAccount(credentials);
    if (!(await saveResult(credentials.environment, result))) {
      return json({ error: 'unavailable' }, 500);
    }
    return result.ok ? json({ ok: true }) : json({ error: result.error }, 502);
  }

  if (action === 'disconnect') {
    await admin.rpc('integration_secret_delete', { p_user: user.id, p_provider: PROVIDER });
    await admin
      .from('investment_snapshots')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', PROVIDER);
    await admin.from('integrations').delete().eq('user_id', user.id).eq('provider', PROVIDER);
    return json({ ok: true });
  }

  return json({ error: 'invalid' }, 400);
});
