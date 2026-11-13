// Open banking (ADR-069): contas bancárias só de leitura através da Enable Banking (agregador
// licenciado PSD2). A pessoa autoriza no próprio banco; a app nunca vê credenciais bancárias.
// - Segredos desta função: ENABLE_BANKING_APP_ID e ENABLE_BANKING_PRIVATE_KEY (PEM PKCS#8 da
//   aplicação registada na Enable Banking). Opcional: BANK_REDIRECT_URL (por omissão
//   https://miven.pt/auth/bank/, que tem de estar registado na aplicação).
// - Guarda só o estado da ligação, o nome das contas, os 4 últimos caracteres do IBAN e o último
//   saldo. Os movimentos seguem para a app (que os regista na base local) e não ficam aqui.
// - Nunca regista respostas, nomes ou valores; só códigos de erro.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { deleteAccountCorsHeaders } from '../../../src/core/account/delete-account-policy.ts';
import {
  BANK_AUTH_STATE_TTL_MS,
  bankAccountKind,
  bankErrorFromStatus,
  canRefreshBank,
  consentValidUntil,
  ibanLast4,
  parseAspsps,
  parseTransactions,
  pickBalance,
  type BankErrorCode,
  type BankTransaction,
} from '../../../src/core/banking/open-banking.ts';

const API = 'https://api.enablebanking.com';
const DEFAULT_REDIRECT = 'https://miven.pt/auth/bank/';
const MAX_PAGES = 20;

function extraOrigins(): string[] {
  return (Deno.env.get('ALLOWED_WEB_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const b64urlText = (value: string) => b64url(new TextEncoder().encode(value));

let signingKey: Promise<CryptoKey | null> | null = null;
function privateKey(): Promise<CryptoKey | null> {
  signingKey ??= (async () => {
    const pem = Deno.env.get('ENABLE_BANKING_PRIVATE_KEY') ?? '';
    const body = pem
      .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
      .replace(/\\n|\s/g, '');
    if (!body || pem.includes('RSA PRIVATE KEY')) return null;
    try {
      const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
      return await crypto.subtle.importKey(
        'pkcs8',
        der,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign'],
      );
    } catch {
      return null;
    }
  })();
  return signingKey;
}

/** JWT da aplicação (RS256), válido 1 hora (a Enable Banking aceita até 24 h). */
async function appToken(appId: string, key: CryptoKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlText(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: appId }));
  const payload = b64urlText(
    JSON.stringify({
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64url(new Uint8Array(signature))}`;
}

type ApiResult = { ok: true; body: unknown } | { ok: false; error: BankErrorCode };

async function api(
  token: string,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ApiResult> {
  try {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return { ok: false, error: bankErrorFromStatus(response.status) };
    return { ok: true, body: await response.json().catch(() => null) };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

const COUNTRY = /^[A-Z]{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

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
  const appId = Deno.env.get('ENABLE_BANKING_APP_ID');
  const key = await privateKey();
  if (!url || !publishable || !secret) return json({ error: 'misconfigured' }, 500);
  // Sem a aplicação da Enable Banking configurada, a app mostra "ainda não disponível".
  if (!appId || !key) return json({ error: 'notConfigured' }, 503);

  const caller = createClient(url, publishable, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await caller.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  // A chave administrativa só lê e escreve linhas desta pessoa (user.id vem da sessão verificada).
  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = await appToken(appId, key);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;

  if (action === 'banks') {
    const country = String(body?.country ?? '');
    if (!COUNTRY.test(country)) return json({ error: 'invalid' }, 400);
    const result = await api(
      token,
      'GET',
      `/aspsps?country=${country}&psu_type=personal&service=AIS`,
    );
    if (!result.ok) return json({ error: result.error }, 502);
    return json({
      banks: parseAspsps(result.body).map(({ name, country: c, logo }) => ({
        name,
        country: c,
        logo,
      })),
    });
  }

  if (action === 'start') {
    const name = String(body?.bank ?? '').slice(0, 200);
    const country = String(body?.country ?? '');
    if (!name || !COUNTRY.test(country)) return json({ error: 'invalid' }, 400);
    const list = await api(
      token,
      'GET',
      `/aspsps?country=${country}&psu_type=personal&service=AIS`,
    );
    if (!list.ok) return json({ error: list.error }, 502);
    const bank = parseAspsps(list.body).find((item) => item.name === name);
    if (!bank) return json({ error: 'invalid' }, 400);
    // O sufixo diz à página de regresso se a autorização começou na web ou na app.
    const state = `${crypto.randomUUID()}.${body?.web === true ? 'w' : 'm'}`;
    await admin
      .from('bank_auth_states')
      .delete()
      .lt('created_at', new Date(Date.now() - BANK_AUTH_STATE_TTL_MS).toISOString());
    const saved = await admin
      .from('bank_auth_states')
      .insert({ state, user_id: user.id, aspsp_name: bank.name, aspsp_country: bank.country });
    if (saved.error) return json({ error: 'unavailable' }, 500);
    const auth = await api(token, 'POST', '/auth', {
      access: { valid_until: consentValidUntil(bank.maxConsentSeconds, Date.now()) },
      aspsp: { name: bank.name, country: bank.country },
      state,
      redirect_url: Deno.env.get('BANK_REDIRECT_URL') ?? DEFAULT_REDIRECT,
      psu_type: 'personal',
    });
    const authUrl = auth.ok ? (auth.body as { url?: unknown } | null)?.url : null;
    if (!auth.ok || typeof authUrl !== 'string' || !authUrl.startsWith('https://')) {
      console.error(`[open-banking] start_failed: ${auth.ok ? 'invalid' : auth.error}`);
      return json({ error: auth.ok ? 'invalid' : auth.error }, 502);
    }
    return json({ url: authUrl });
  }

  if (action === 'finish') {
    const code = String(body?.code ?? '');
    const state = String(body?.state ?? '');
    if (!code || code.length > 2000 || !state) return json({ error: 'invalid' }, 400);
    const { data: pending } = await admin
      .from('bank_auth_states')
      .select('aspsp_name, aspsp_country, created_at')
      .eq('state', state)
      .eq('user_id', user.id)
      .maybeSingle();
    // Uma única utilização: o regresso não pode ser repetido nem aproveitado por outra pessoa.
    await admin.from('bank_auth_states').delete().eq('state', state).eq('user_id', user.id);
    if (!pending || Date.now() - Date.parse(pending.created_at) > BANK_AUTH_STATE_TTL_MS) {
      return json({ error: 'expired' }, 400);
    }
    const session = await api(token, 'POST', '/sessions', { code });
    if (!session.ok) {
      console.error(`[open-banking] session_failed: ${session.error}`);
      return json({ error: session.error }, 502);
    }
    const data = session.body as {
      session_id?: unknown;
      accounts?: unknown;
      access?: { valid_until?: unknown };
    } | null;
    if (typeof data?.session_id !== 'string' || !Array.isArray(data.accounts)) {
      return json({ error: 'invalid' }, 502);
    }
    const validUntil =
      typeof data.access?.valid_until === 'string'
        ? data.access.valid_until
        : consentValidUntil(null, Date.now());
    const { data: connection, error } = await admin
      .from('bank_connections')
      .insert({
        user_id: user.id,
        session_id: data.session_id,
        aspsp_name: pending.aspsp_name,
        aspsp_country: pending.aspsp_country,
        status: 'connected',
        valid_until: validUntil,
      })
      .select('id')
      .single();
    if (error || !connection) return json({ error: 'unavailable' }, 500);
    for (const raw of data.accounts as Record<string, unknown>[]) {
      const uid = typeof raw.uid === 'string' ? raw.uid : null;
      const currency =
        typeof raw.currency === 'string' && /^[A-Z]{3}$/.test(raw.currency) ? raw.currency : null;
      if (!uid || !currency) continue;
      const accountId = raw.account_id as { iban?: unknown } | undefined;
      // O produto ("Conta Ordem", "Cartão Crédito") diz mais do que o nome, que costuma ser o titular.
      const name = [raw.product, raw.name, raw.details].find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );
      const balance = await api(token, 'GET', `/accounts/${encodeURIComponent(uid)}/balances`);
      const picked = balance.ok ? pickBalance(balance.body) : null;
      await admin.from('bank_accounts').insert({
        connection_id: connection.id,
        user_id: user.id,
        uid,
        name: name ? name.trim().slice(0, 200) : null,
        kind: bankAccountKind(raw),
        iban_last4: ibanLast4(accountId?.iban),
        currency,
        balance: picked && picked.currency === currency ? picked.amount : null,
        balance_at: picked ? new Date().toISOString() : null,
      });
    }
    await admin
      .from('bank_connections')
      .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', connection.id);
    return json({ connectionId: connection.id });
  }

  const connectionId = String(body?.connectionId ?? '');
  const { data: connection } = connectionId
    ? await admin
        .from('bank_connections')
        .select('id, session_id, valid_until, last_sync_at')
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };

  if (action === 'refresh') {
    if (!connection) return json({ error: 'invalid' }, 404);
    const now = Date.now();
    if (Date.parse(connection.valid_until) <= now) {
      await admin
        .from('bank_connections')
        .update({ status: 'expired', last_error: 'expired', updated_at: new Date().toISOString() })
        .eq('id', connection.id);
      return json({ error: 'expired' }, 409);
    }
    if (body?.force !== true && !canRefreshBank(connection.last_sync_at, now)) {
      return json({ error: 'tooSoon' }, 429);
    }
    const since = Object.fromEntries(
      Object.entries((body?.since ?? {}) as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string' && DAY.test(entry[1]),
      ),
    );
    const { data: accounts } = await admin
      .from('bank_accounts')
      .select('id, uid, currency')
      .eq('connection_id', connection.id);
    const result: { id: string; balance: number | null; transactions: BankTransaction[] }[] = [];
    let failure: BankErrorCode | null = null;
    for (const account of accounts ?? []) {
      const path = `/accounts/${encodeURIComponent(account.uid)}`;
      const balance = await api(token, 'GET', `${path}/balances`);
      if (!balance.ok) {
        failure = balance.error;
        break;
      }
      const picked = pickBalance(balance.body);
      const amount = picked && picked.currency === account.currency ? picked.amount : null;
      const transactions: BankTransaction[] = [];
      const from = since[account.id];
      if (from) {
        let continuation: string | null = null;
        for (let page = 0; page < MAX_PAGES; page += 1) {
          const query = new URLSearchParams({ date_from: from });
          if (continuation) query.set('continuation_key', continuation);
          const list = await api(token, 'GET', `${path}/transactions?${query}`);
          if (!list.ok) {
            failure = list.error;
            break;
          }
          transactions.push(
            ...parseTransactions(list.body).filter((item) => item.currency === account.currency),
          );
          const next = (list.body as { continuation_key?: unknown } | null)?.continuation_key;
          continuation = typeof next === 'string' && next ? next : null;
          if (!continuation) break;
        }
      }
      if (failure) break;
      await admin
        .from('bank_accounts')
        .update({
          balance: amount,
          balance_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);
      result.push({ id: account.id, balance: amount, transactions });
    }
    const stamp = new Date().toISOString();
    await admin
      .from('bank_connections')
      .update({
        status: failure === 'unauthorized' ? 'expired' : failure ? 'error' : 'connected',
        last_error: failure,
        last_sync_at: stamp,
        updated_at: stamp,
      })
      .eq('id', connection.id);
    if (failure) {
      console.error(`[open-banking] refresh_failed: ${failure}`);
      return json({ error: failure }, 502);
    }
    return json({ accounts: result });
  }

  if (action === 'disconnect') {
    if (!connection) return json({ ok: true });
    // Fecha o consentimento no banco sempre que possível; apaga sempre do nosso lado.
    await api(token, 'DELETE', `/sessions/${encodeURIComponent(connection.session_id)}`);
    await admin.from('bank_connections').delete().eq('id', connection.id).eq('user_id', user.id);
    return json({ ok: true });
  }

  return json({ error: 'invalid' }, 400);
});
