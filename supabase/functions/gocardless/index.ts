import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import {
  buildBookedExternalId,
  buildExternalId,
  createRequisition,
  deleteRequisition,
  extractTransactionDescription,
  getAccountDetails,
  getAccountTransactions,
  getGoCardlessAccessToken,
  getRequisition,
  isGoCardlessRateLimitError,
  listInstitutions,
  mapGoCardlessAmount,
  mapRequisitionStatus,
  resolveTransactionDate,
  sleep,
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

/** GoCardless: ~4 pedidos/dia/conta no endpoint transactions — intervalo mínimo entre syncs automáticos. */
const AUTO_SYNC_MIN_INTERVAL_MS = 5.5 * 60 * 60 * 1000;
const CONNECTION_SYNC_DELAY_MS = 1_500;
const ACCOUNT_SYNC_DELAY_MS = 800;
/** Consentimento PSD2 típico: 90 dias. */
const CONSENT_VALIDITY_DAYS = 90;
const CONSENT_WARNING_DAYS = 7;
/** Score fuzzy acima do limiar mas abaixo disto → baixa confiança. */
const LOW_CONFIDENCE_SCORE_CEILING = 0.78;

type SyncSource = 'manual' | 'auto';

type SyncConnectionResult = {
  imported: number;
  skipped: number;
  lowConfidenceCount: number;
  rateLimited: boolean;
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

function consentExpiresAtFromNow(): string {
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + CONSENT_VALIDITY_DAYS);
  return expires.toISOString();
}

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (24 * 60 * 60 * 1000));
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

async function loadExistingExternalIds(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<Set<string>> {
  const { data } = await admin
    .from('transactions')
    .select('external_id')
    .eq('user_id', userId)
    .not('external_id', 'is', null);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.external_id) ids.add(String(row.external_id));
  }
  return ids;
}

async function ensureConnectionActive(
  admin: ReturnType<typeof createClient>,
  token: string,
  connection: Record<string, unknown>,
): Promise<'linked' | 'expired' | 'error'> {
  const requisitionId = String(connection.requisition_id);
  const requisition = await getRequisition(token, requisitionId);
  const status = mapRequisitionStatus(requisition.status);

  if (status !== String(connection.status)) {
    await admin
      .from('bank_connections')
      .update({ status })
      .eq('id', connection.id);
  }

  return status;
}

async function recordSyncDigest(
  admin: ReturnType<typeof createClient>,
  userId: string,
  connectionId: string,
  imported: number,
  lowConfidenceCount: number,
): Promise<void> {
  if (imported <= 0) return;

  await admin.from('open_banking_sync_digests').insert({
    user_id: userId,
    connection_id: connectionId,
    kind: 'import',
    imported_count: imported,
    low_confidence_count: lowConfidenceCount,
  });
}

async function syncConnectionForUser(
  admin: ReturnType<typeof createClient>,
  token: string,
  userId: string,
  connectionId: string,
  options: { syncSource: SyncSource } = { syncSource: 'manual' },
): Promise<SyncConnectionResult> {
  const { data: connection, error: connectionError } = await admin
    .from('bank_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (connectionError || !connection) {
    throw new Error('Ligação bancária não encontrada');
  }

  const liveStatus = await ensureConnectionActive(admin, token, connection);
  if (liveStatus !== 'linked') {
    throw new Error(
      liveStatus === 'expired'
        ? 'Consentimento bancário expirado — renova a ligação'
        : 'A ligação ainda não está activa',
    );
  }

  const { data: accounts } = await admin
    .from('bank_connection_accounts')
    .select('*')
    .eq('connection_id', connectionId);

  const merchantGroups = await loadMerchantGroups(admin, userId);
  const existingExternalIds = await loadExistingExternalIds(admin, userId);

  let imported = 0;
  let skipped = 0;
  let lowConfidenceCount = 0;
  let rateLimited = false;
  const nowIso = new Date().toISOString();

  for (const account of accounts ?? []) {
    let accountStatus: 'success' | 'failed' | 'skipped' = 'success';
    let accountError: string | null = null;

    try {
      const transactions = await getAccountTransactions(token, account.gocardless_account_id);
      await sleep(ACCOUNT_SYNC_DELAY_MS);

      for (const gcTx of transactions) {
        const externalId = buildExternalId(account.gocardless_account_id, gcTx);
        if (existingExternalIds.has(externalId)) {
          skipped += 1;
          continue;
        }

        const bookedId = buildBookedExternalId(account.gocardless_account_id, gcTx);
        if (gcTx._pending && bookedId && existingExternalIds.has(bookedId)) {
          skipped += 1;
          continue;
        }

        const { type, amount } = mapGoCardlessAmount(gcTx);
        if (amount <= 0) {
          skipped += 1;
          continue;
        }

        const description = extractTransactionDescription(gcTx);
        const match = matchMerchantDescription(description, merchantGroups);
        const date = resolveTransactionDate(gcTx);
        const isLowConfidence =
          match.score > 0 && match.score < LOW_CONFIDENCE_SCORE_CEILING;

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
            existingExternalIds.add(externalId);
            continue;
          }
          throw new Error(insertError.message);
        }

        existingExternalIds.add(externalId);
        imported += 1;
        if (isLowConfidence) lowConfidenceCount += 1;
      }

      if (options.syncSource === 'auto') {
        await admin
          .from('bank_connection_accounts')
          .update({
            last_auto_sync_at: nowIso,
            last_auto_sync_status: 'success',
          })
          .eq('id', account.id);
      }
    } catch (accountSyncError) {
      if (isGoCardlessRateLimitError(accountSyncError)) {
        rateLimited = true;
        accountStatus = 'skipped';
        accountError = 'Limite de pedidos GoCardless — tenta mais tarde';
      } else {
        accountStatus = 'failed';
        accountError =
          accountSyncError instanceof Error ? accountSyncError.message : 'Sync falhou';
        throw accountSyncError;
      }

      if (options.syncSource === 'auto') {
        await admin
          .from('bank_connection_accounts')
          .update({
            last_auto_sync_at: nowIso,
            last_auto_sync_status: accountStatus,
          })
          .eq('id', account.id);
      }
    }

    if (accountError && accountStatus === 'skipped') {
      // Rate limit numa conta — continuar com as restantes ligações noutro cron.
      break;
    }
  }

  const connectionUpdate: Record<string, unknown> = {
    last_sync_at: nowIso,
    last_sync_status: rateLimited && imported === 0 ? 'failed' : 'success',
    last_sync_error: rateLimited && imported === 0 ? 'Limite GoCardless atingido' : null,
    last_sync_source: options.syncSource,
  };

  if (options.syncSource === 'auto') {
    connectionUpdate.last_auto_sync_at = nowIso;
  }

  await admin.from('bank_connections').update(connectionUpdate).eq('id', connectionId);

  if (options.syncSource === 'auto') {
    await recordSyncDigest(admin, userId, connectionId, imported, lowConfidenceCount);
  }

  return { imported, skipped, lowConfidenceCount, rateLimited };
}

async function checkExpiringConsents(
  admin: ReturnType<typeof createClient>,
  token: string,
): Promise<{ warned: number; expired: number }> {
  const warningThreshold = new Date();
  warningThreshold.setUTCDate(warningThreshold.getUTCDate() + CONSENT_WARNING_DAYS);

  const { data: connections } = await admin
    .from('bank_connections')
    .select('id, user_id, requisition_id, consent_expires_at, consent_expiry_notified_at, status')
    .in('status', ['linked', 'expired'])
    .not('consent_expires_at', 'is', null)
    .lte('consent_expires_at', warningThreshold.toISOString());

  let warned = 0;
  let expired = 0;

  for (const connection of connections ?? []) {
    try {
      const requisition = await getRequisition(token, String(connection.requisition_id));
      const status = mapRequisitionStatus(requisition.status);

      if (status === 'expired' && connection.status !== 'expired') {
        await admin
          .from('bank_connections')
          .update({ status: 'expired' })
          .eq('id', connection.id);
        expired += 1;
        continue;
      }

      const expiresAt = String(connection.consent_expires_at);
      const daysLeft = daysUntil(expiresAt);
      if (daysLeft > CONSENT_WARNING_DAYS || daysLeft < 0) continue;

      const notifiedAt = connection.consent_expiry_notified_at as string | null;
      if (notifiedAt) {
        const notifiedDaysAgo =
          (Date.now() - new Date(notifiedAt).getTime()) / (24 * 60 * 60 * 1000);
        if (notifiedDaysAgo < 3) continue;
      }

      await admin.from('open_banking_sync_digests').insert({
        user_id: connection.user_id,
        connection_id: connection.id,
        kind: 'consent_expiry',
        imported_count: 0,
        low_confidence_count: 0,
      });

      await admin
        .from('bank_connections')
        .update({ consent_expiry_notified_at: new Date().toISOString() })
        .eq('id', connection.id);

      warned += 1;
      await sleep(200);
    } catch {
      // Continuar com outras ligações.
    }
  }

  return { warned, expired };
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
      authHeader === `Bearer ${serviceRole}`);

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

      const connectionUpdate: Record<string, unknown> = { status };
      if (status === 'linked') {
        connectionUpdate.consent_expires_at = consentExpiresAtFromNow();
        connectionUpdate.consent_expiry_notified_at = null;
      }

      await admin.from('bank_connections').update(connectionUpdate).eq('id', connection.id);

      if (status === 'linked') {
        try {
          const syncResult = await syncConnectionForUser(admin, token, userId, connection.id, {
            syncSource: 'manual',
          });
          return json({ status, connectionId: connection.id, sync: syncResult });
        } catch (syncError) {
          await admin
            .from('bank_connections')
            .update({
              last_sync_status: 'failed',
              last_sync_error: syncError instanceof Error ? syncError.message : 'Sync falhou',
              last_sync_source: 'manual',
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
          .select(
            'id, iban, name, currency, gocardless_account_id, last_auto_sync_at, last_auto_sync_status',
          )
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
        const result = await syncConnectionForUser(admin, token, userId, body.connectionId, {
          syncSource: 'manual',
        });
        return json({ ok: true, ...result });
      } catch (syncError) {
        await admin
          .from('bank_connections')
          .update({
            last_sync_status: 'failed',
            last_sync_error: syncError instanceof Error ? syncError.message : 'Sync falhou',
            last_sync_source: 'manual',
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
        .select('id, user_id, last_auto_sync_at, consent_expires_at')
        .eq('status', 'linked')
        .order('last_auto_sync_at', { ascending: true, nullsFirst: true });

      let synced = 0;
      let failed = 0;
      let skipped = 0;
      let totalImported = 0;

      const now = Date.now();

      for (const connection of connections ?? []) {
        const lastAuto = connection.last_auto_sync_at as string | null;
        if (lastAuto && now - new Date(lastAuto).getTime() < AUTO_SYNC_MIN_INTERVAL_MS) {
          skipped += 1;
          continue;
        }

        try {
          const result = await syncConnectionForUser(
            admin,
            token,
            connection.user_id,
            connection.id,
            { syncSource: 'auto' },
          );
          synced += 1;
          totalImported += result.imported;
          if (result.rateLimited) skipped += 1;
        } catch (error) {
          failed += 1;
          await admin
            .from('bank_connections')
            .update({
              last_sync_status: 'failed',
              last_sync_error: error instanceof Error ? error.message : 'Sync falhou',
              last_sync_source: 'auto',
            })
            .eq('id', connection.id);
        }

        await sleep(CONNECTION_SYNC_DELAY_MS);
      }

      const consentCheck = await checkExpiringConsents(admin, token);

      return json({
        synced,
        failed,
        skipped,
        totalImported,
        total: (connections ?? []).length,
        consentWarnings: consentCheck.warned,
        consentExpired: consentCheck.expired,
      });
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
