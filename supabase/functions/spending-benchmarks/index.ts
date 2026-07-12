import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import {
  buildBenchmarkAggregates,
  type UserBenchmarkInput,
} from '../_shared/benchmark-aggregate.ts';
import { MIN_BENCHMARK_SAMPLE_COUNT } from '../_shared/income-buckets.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

type ActionRequest =
  | { action: 'aggregate' }
  | { action: 'list_benchmarks'; incomeBucketKey: string; region?: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const TX_PAGE_SIZE = 1000;
const USER_BATCH_SIZE = 40;

async function fetchUserTransactions(
  admin: ReturnType<typeof createClient>,
  userId: string,
  sinceDate: string,
): Promise<UserBenchmarkInput['transactions']> {
  const rows: UserBenchmarkInput['transactions'] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('transactions')
      .select('type, amount, category, transaction_date, credit_id')
      .eq('user_id', userId)
      .gte('transaction_date', sinceDate)
      .order('transaction_date', { ascending: true })
      .range(from, from + TX_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < TX_PAGE_SIZE) break;
    from += TX_PAGE_SIZE;
  }

  return rows;
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
    body.action === 'aggregate' &&
    (cronHeader === cronSecret || authHeader === `Bearer ${serviceRole}`);

  try {
    if (body.action === 'aggregate') {
      if (!isCron) return json({ error: 'Não autorizado' }, 403);

      const { data: consented, error: consentError } = await admin
        .from('user_preferences')
        .select('user_id, region')
        .eq('benchmark_contribution_consent', true);

      if (consentError) throw new Error(consentError.message);

      const since = new Date();
      since.setMonth(since.getMonth() - 5);
      const sinceDate = since.toISOString().slice(0, 10);

      const userInputs: UserBenchmarkInput[] = [];

      for (let i = 0; i < (consented ?? []).length; i += USER_BATCH_SIZE) {
        const batch = (consented ?? []).slice(i, i + USER_BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (row) => ({
            userId: String(row.user_id),
            region: String(row.region ?? 'PT'),
            transactions: await fetchUserTransactions(admin, String(row.user_id), sinceDate),
          })),
        );
        userInputs.push(...results);
      }

      const aggregates = buildBenchmarkAggregates(userInputs);
      const periodMonthKey = aggregates[0]?.period_month_key ?? null;

      if (periodMonthKey) {
        await admin.from('spending_benchmarks').delete().eq('period_month_key', periodMonthKey);
      }

      if (aggregates.length > 0) {
        const { error: insertError } = await admin.from('spending_benchmarks').insert(aggregates);
        if (insertError) throw new Error(insertError.message);
      }

      return json({
        ok: true,
        optedInUsers: (consented ?? []).length,
        publishedBuckets: aggregates.length,
        minSampleSize: MIN_BENCHMARK_SAMPLE_COUNT,
        periodMonthKey,
      });
    }

    if (body.action === 'list_benchmarks') {
      if (!authHeader) return json({ error: 'Não autenticado' }, 401);

      const userClient = createClient(supabaseUrl, supabaseAnon, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await userClient.auth.getUser();
      if (userError || !userData.user) return json({ error: 'Sessão inválida' }, 401);

      if (!body.incomeBucketKey) {
        return json({ error: 'incomeBucketKey em falta' }, 400);
      }

      const region = (body.region ?? 'PT').toUpperCase();

      const { data: benchmarks, error: listError } = await admin
        .from('spending_benchmarks')
        .select(
          'income_bucket_key, income_bucket_label, category, region, mean_amount, median_amount, sample_count, period_month_key, computed_at',
        )
        .eq('income_bucket_key', body.incomeBucketKey)
        .eq('region', region)
        .gte('sample_count', MIN_BENCHMARK_SAMPLE_COUNT)
        .order('category', { ascending: true });

      if (listError) throw new Error(listError.message);

      return json({ benchmarks: benchmarks ?? [] });
    }

    return json({ error: 'Acção desconhecida' }, 400);
  } catch (error) {
    console.error('spending-benchmarks error', error);
    return json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      500,
    );
  }
});
