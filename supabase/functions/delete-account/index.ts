// Eliminação de conta (RGPD). A chave administrativa existe só neste ambiente de servidor.
// A decisão (confirmação + sessão recente) está em src/core e é a mesma que os testes executam.
import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  deleteAccountCorsHeaders,
  evaluateDeleteAccount,
} from '../../../src/core/account/delete-account-policy.ts';

function extraOrigins(): string[] {
  return (Deno.env.get('ALLOWED_WEB_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
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
  if (!url || !publishable || !secret) return json({ error: 'misconfigured' }, 500);

  let confirm: unknown;
  try {
    const body = (await req.json()) as { confirm?: unknown } | null;
    confirm = body?.confirm;
  } catch {
    confirm = undefined;
  }

  const caller = createClient(url, publishable, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  const decision = evaluateDeleteAccount({
    confirm,
    lastSignInAt: user.last_sign_in_at,
    now: Date.now(),
  });
  if (!decision.ok) return json({ error: decision.error }, 401);

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Só o id do JWT. Um user_id no corpo é ignorado.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[delete-account] failed');
    return json({ error: 'delete_failed' }, 500);
  }
  return json({ ok: true });
});
