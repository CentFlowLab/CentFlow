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
  // Ficheiros dos documentos primeiro (ADR-056): sem eles, ficariam órfãos no Storage.
  if (!(await removeUserFiles(admin, user.id))) {
    console.error('[delete-account] files_failed');
    return json({ error: 'delete_failed' }, 500);
  }
  // Só o id do JWT. Um user_id no corpo é ignorado.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[delete-account] failed');
    return json({ error: 'delete_failed' }, 500);
  }
  return json({ ok: true });
});

/**
 * Apaga `documents/<userId>/<documento>/<ficheiro>`. Sem o balde (ambiente sem a migração), não há
 * nada a apagar. Devolve `false` se não conseguir listar ou apagar.
 */
async function removeUserFiles(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const bucket = admin.storage.from('documents');
  const folders = await bucket.list(userId, { limit: 1000 });
  if (folders.error) return /not found/i.test(folders.error.message);
  const paths: string[] = [];
  for (const folder of folders.data ?? []) {
    const files = await bucket.list(`${userId}/${folder.name}`, { limit: 1000 });
    if (files.error) return false;
    for (const file of files.data ?? []) paths.push(`${userId}/${folder.name}/${file.name}`);
  }
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await bucket.remove(paths.slice(index, index + 100));
    if (error) return false;
  }
  return true;
}
