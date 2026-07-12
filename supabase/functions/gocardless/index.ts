import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import {
  buildExternalId,
  createRequisition,
  deleteRequisition,
  extractTransactionDescription,
  getAccountDetails,
  getAccountTransactions,
  getGoCardlessAccessToken,
  getRequisition,
  listInstitutions,
  mapGoCardlessAmount,
  mapRequisitionStatus,
  resolveTransactionDate,
} from '../_shared/gocardless-api.ts';
import {
  matchMerchantDescription,
  type MerchantGroupRecord,
} from '../_shared/merchant-matching.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

type ActionRequest =
  | { action: 'list_institutions' }
  | { action: 'create_link'; institutionId: string; redirectUrl: string }
  | { action: 'finalize_link'; requisitionId: string }
  | { action: 'list_connections' }
  | { action: 'revoke_connection'; connectionId: string }
  | { action: 'sync_connection'; connectionId: string }
  | { action: 'sync_all' };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSecrets() {
  const secretId = Deno.env.get('GOCARDLESS_SECRET_ID');
  const secretKey = Deno.env.get('GOCARDLESS_SECRET_KEY');
  if (!secretId || !secretKey) {
    return {
      error: json(
        {
          error: 'Open Banking não configurado',
          hint: 'Define GOCARDLESS_SECRET_ID e GOCARDLESS_SECRET_KEY nos secrets Supabase',
        },
        503,
      ),
    };
  }
  return { secretId, secretKey };
}

async function loadMerchantGroups(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<MerchantGroupRecord[]> {
  const { data } = await admin
    .from('merchant_groups')
    .select('id, name, aliases, category')
    .eq('user_id', userId);
  return (data ?? []) as MerchantGroupRecord[];
}

async function syncConnectionForUser(
  admin: ReturnType<typeof createClient>,
  token: string,
  userId: string,
  connectionId: string,
) {
  const { data: connection, error: connectionError } = await admin
    .from('bank_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (connectionError || !connection) {
    throw new Error('Ligação bancária não encontrada');
  }

  if (connection.status !== 'linked') {
    throw new Error('A ligação ainda não está activa');
  }

  const { data: accounts } = await admin
    .from('bank_connection_accounts')
    .select('*')
    .eq('connection_id', connectionId);

  const merchantGroups = await loadMerchantGroups(admin, userId);
  let imported = 0;
  let skipped = 0;

  for (const account of accounts ?? []) {
    const transactions = await getAccountTransactions(token, account.gocardless_account_id);

    for (const gcTx of transactions) {
      const externalId = buildExternalId(account.gocardless_account_id, gcTx);
      const { type, amount } = mapGoCardlessAmount(gcTx);
      if (amount <= 0) {
        skipped += 1;
        continue;
      }

      const description = extractTransactionDescription(gcTx);
      const match = matchMerchantDescription(description, merchantGroups);
      const date = resolveTransactionDate(gcTx);

      const { error: insertError } = await admin.from('transactions').insert({
        user_id: userId,
        type,
        amount,
        category: match.category,
        description,
        transaction_date: date,
        currency: gcTx.transactionAmount?.currency ?? account.currency ?? 'EUR',
        source: 'open_banking',
        external_id: externalId,
        bank_connection_id: connectionId,
        merchant: match.merchantName,
        merchant_group_id: match.merchantGroupId || null,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          skipped += 1;
          continue;
        }
        throw new Error(insertError.message);
      }
      imported += 1;
    }
  }

  await admin
    .from('bank_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'success',
      last_sync_error: null,
    })
    .eq('id', connectionId);

  return { imported, skipped };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cronSecret = Deno.env.get('EMAIL_CRON_SECRET');

  if (!supabaseUrl || !supabaseAnon || !serviceRole) {
    return json({ error: 'Supabase não configurado' }, 500);
  }

  let body: ActionRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRole);
  const authHeader = req.headers.get('Authorization');
  const cronHeader = req.headers.get('x-cron-secret');

  const isCron =
    body.action === 'sync_all' &&
    (cronHeader === cronSecret ||
      authHeader === `Bearer ${serviceRole}` ||
      authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`);

  let userId: string | null = null;

  if (!isCron) {
    if (!authHeader) return json({ error: 'Não autenticado' }, 401);
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Sessão inválida' }, 401);
    userId = userData.user.id;
  }

  const secrets = getSecrets();
  if ('error' in secrets) return secrets.error;

  try {
    const token = await getGoCardlessAccessToken(secrets.secretId, secrets.secretKey);

    if (body.action === 'list_institutions') {
      const institutions = await listInstitutions(token, 'PT');
      return json({ institutions });
    }

    if (body.action === 'create_link') {
      if (!userId) return json({ error: 'Não autenticado' }, 401);
      if (!body.institutionId || !body.redirectUrl) {
        return json({ error: 'institutionId e redirectUrl são obrigatórios' }, 400);
      }

      const connectionId = crypto.randomUUID();
      const reference = `${userId}:${connectionId}`;
      const requisition = await createRequisition(token, {
        institutionId: body.institutionId,
        redirect: body.redirectUrl,
        reference,
      });

      const institutions = await listInstitutions(token, 'PT');
      const institution = institutions.find((item) => item.id === body.institutionId);

      const { error: insertError } = await admin.from('bank_connections').insert({
        id: connectionId,
        user_id: userId,
        institution_id: body.institutionId,
        institution_name: institution?.name ?? body.institutionId,
        requisition_id: requisition.id,
        status: 'pending',
      });

      if (insertError) throw new Error(insertError.message);

      return json({
        connectionId,
        requisitionId: requisition.id,
        link: requisition.link,
      });
    }

    if (body.action === 'finalize_link') {
      if (!userId) return json({ error: 'Não autenticado' }, 401);
      if (!body.requisitionId) return json({ error: 'requisitionId em falta' }, 400);

      const requisition = await getRequisition(token, body.requisitionId);
      const status = mapRequisitionStatus(requisition.status);

      const { data: connection, error: findError } = await admin
        .from('bank_connections')
        .select('*')
        .eq('requisition_id', body.requisitionId)
        .eq('user_id', userId)
        .maybeSingle();

      if (findError || !connection) {
        return json({ error: 'Ligação não encontrada' }, 404);
      }

      if (status === 'linked' && requisition.accounts?.length) {
        for (const accountId of requisition.accounts) {
          const details = await getAccountDetails(token, accountId);
          await admin.from('bank_connection_accounts').upsert(
            {
              user_id: userId,
              connection_id: connection.id,
              gocardless_account_id: accountId,
              iban: details.iban ?? null,
              name: details.name ?? null,
              currency: details.currency ?? 'EUR',
            },
            { onConflict: 'gocardless_account_id' },
          );
        }
      }

      await admin
        .from('bank_connections')
        .update({ status })
        .eq('id', connection.id);

      if (status === 'linked') {
        try {
          const syncResult = await syncConnectionForUser(admin, token, userId, connection.id);
          return json({ status, connectionId: connection.id, sync: syncResult });
        } catch (syncError) {
          await admin
            .from('bank_connections')
            .update({
              last_sync_status: 'failed',
              last_sync_error: syncError instanceof Error ? syncError.message : 'Sync falhou',
            })
            .eq('id', connection.id);
          return json({
            status,
            connectionId: connection.id,
            syncError: syncError instanceof Error ? syncError.message : 'Sync falhou',
          });
        }
      }

      return json({ status, connectionId: connection.id });
    }

    if (body.action === 'list_connections') {
      if (!userId) return json({ error: 'Não autenticado' }, 401);

      const { data: connections } = await admin
        .from('bank_connections')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'revoked')
        .order('created_at', { ascending: false });

      const enriched = [];
      for (const connection of connections ?? []) {
        const { data: accounts } = await admin
          .from('bank_connection_accounts')
          .select('id, iban, name, currency, gocardless_account_id')
          .eq('connection_id', connection.id);
        enriched.push({ ...connection, accounts: accounts ?? [] });
      }

      return json({ connections: enriched });
    }

    if (body.action === 'revoke_connection') {
      if (!userId) return json({ error: 'Não autenticado' }, 401);
      if (!body.connectionId) return json({ error: 'connectionId em falta' }, 400);

      const { data: connection } = await admin
        .from('bank_connections')
        .select('*')
        .eq('id', body.connectionId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!connection) return json({ error: 'Ligação não encontrada' }, 404);

      try {
        await deleteRequisition(token, connection.requisition_id);
      } catch {
        // revoga localmente mesmo se a API falhar
      }

      await admin
        .from('bank_connections')
        .update({ status: 'revoked' })
        .eq('id', connection.id);

      return json({ ok: true });
    }

    if (body.action === 'sync_connection') {
      if (!userId) return json({ error: 'Não autenticado' }, 401);
      if (!body.connectionId) return json({ error: 'connectionId em falta' }, 400);

      try {
        const result = await syncConnectionForUser(admin, token, userId, body.connectionId);
        return json({ ok: true, ...result });
      } catch (syncError) {
        await admin
          .from('bank_connections')
          .update({
            last_sync_status: 'failed',
            last_sync_error: syncError instanceof Error ? syncError.message : 'Sync falhou',
          })
          .eq('id', body.connectionId);
        return json(
          { error: syncError instanceof Error ? syncError.message : 'Sync falhou' },
          500,
        );
      }
    }

    if (body.action === 'sync_all') {
      if (!isCron) return json({ error: 'Não autorizado' }, 403);

      const { data: connections } = await admin
        .from('bank_connections')
        .select('id, user_id')
        .eq('status', 'linked');

      let synced = 0;
      let failed = 0;

      for (const connection of connections ?? []) {
        try {
          await syncConnectionForUser(admin, token, connection.user_id, connection.id);
          synced += 1;
        } catch (error) {
          failed += 1;
          await admin
            .from('bank_connections')
            .update({
              last_sync_status: 'failed',
              last_sync_error: error instanceof Error ? error.message : 'Sync falhou',
            })
            .eq('id', connection.id);
        }
      }

      return json({ synced, failed, total: (connections ?? []).length });
    }

    return json({ error: 'Acção desconhecida' }, 400);
  } catch (error) {
    console.error('gocardless error', error);
    return json(
      { error: error instanceof Error ? error.message : 'Erro interno Open Banking' },
      500,
    );
  }
});
