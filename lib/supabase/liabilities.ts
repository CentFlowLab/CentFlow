import type { Subscription, SubscriptionBillingInterval } from '@/lib/domain/assets.types';
import type { Credit, CreditType } from '@/lib/domain/types';

import type { TablesInsert } from './database.types';

import { getSupabaseClient } from './client';

type CreditRow = {
  id: string;
  name: string;
  outstanding_balance: number;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  original_amount: number | null;
  interest_rate_annual: number | null;
  index_rate: number | null;
  spread: number | null;
  term_months: number | null;
  monthly_payment: number | null;
  insurance_monthly: number | null;
  credit_type: string | null;
  lender: string | null;
  start_date: string | null;
  monthly_income: number | null;
  notes: string | null;
};

type SubscriptionRow = {
  id: string;
  name: string;
  amount: number;
  billing_interval: SubscriptionBillingInterval;
  renews_at: string | null;
  category: string | null;
  notes: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function mapCreditRow(row: CreditRow): Credit {
  return {
    id: row.id,
    name: row.name,
    outstandingBalance: Number(row.outstanding_balance),
    nextPaymentDate: row.next_payment_date ?? undefined,
    nextPaymentAmount: row.next_payment_amount ? Number(row.next_payment_amount) : undefined,
    originalAmount: row.original_amount ? Number(row.original_amount) : undefined,
    interestRateAnnual: row.interest_rate_annual ? Number(row.interest_rate_annual) : undefined,
    indexRate: row.index_rate ? Number(row.index_rate) : undefined,
    spread: row.spread ? Number(row.spread) : undefined,
    termMonths: row.term_months ?? undefined,
    monthlyPayment: row.monthly_payment ? Number(row.monthly_payment) : undefined,
    insuranceMonthly: row.insurance_monthly ? Number(row.insurance_monthly) : undefined,
    creditType: (row.credit_type as CreditType | null) ?? undefined,
    lender: row.lender ?? undefined,
    startDate: row.start_date ?? undefined,
    monthlyIncome: row.monthly_income ? Number(row.monthly_income) : undefined,
    notes: row.notes ?? undefined,
  };
}

function mapSubscriptionRow(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    billingInterval: row.billing_interval ?? 'monthly',
    renewsAt: row.renews_at ?? undefined,
    category: row.category ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function creditToInsert(credit: Credit, userId: string): TablesInsert<'credits'> {
  return {
    id: isUuid(credit.id) ? credit.id : undefined,
    user_id: userId,
    name: credit.name,
    outstanding_balance: credit.outstandingBalance,
    next_payment_date: credit.nextPaymentDate ?? null,
    next_payment_amount: credit.nextPaymentAmount ?? null,
    original_amount: credit.originalAmount ?? null,
    interest_rate_annual: credit.interestRateAnnual ?? null,
    index_rate: credit.indexRate ?? null,
    spread: credit.spread ?? null,
    term_months: credit.termMonths ?? null,
    monthly_payment: credit.monthlyPayment ?? null,
    insurance_monthly: credit.insuranceMonthly ?? null,
    credit_type: credit.creditType ?? null,
    lender: credit.lender ?? null,
    start_date: credit.startDate ?? null,
    monthly_income: credit.monthlyIncome ?? null,
    notes: credit.notes ?? null,
  };
}

function subscriptionToInsert(
  subscription: Subscription,
  userId: string,
): TablesInsert<'subscriptions'> {
  return {
    id: isUuid(subscription.id) ? subscription.id : undefined,
    user_id: userId,
    name: subscription.name,
    amount: subscription.amount,
    billing_interval: subscription.billingInterval ?? 'monthly',
    renews_at: subscription.renewsAt ?? null,
    category: subscription.category ?? null,
    notes: subscription.notes ?? null,
  };
}

async function getUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Utilizador não autenticado');
  return user.id;
}

export async function fetchLiabilitiesFromSupabase(): Promise<{
  credits: Credit[];
  subscriptions: Subscription[];
}> {
  const supabase = getSupabaseClient();

  const [creditsRes, subscriptionsRes] = await Promise.all([
    supabase.from('credits').select('*').order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
  ]);

  if (creditsRes.error) throw new Error(creditsRes.error.message);
  if (subscriptionsRes.error) throw new Error(subscriptionsRes.error.message);

  return {
    credits: (creditsRes.data ?? []).map((row) => mapCreditRow(row as CreditRow)),
    subscriptions: (subscriptionsRes.data ?? []).map((row) =>
      mapSubscriptionRow(row as SubscriptionRow),
    ),
  };
}

export async function upsertCreditToSupabase(credit: Credit): Promise<Credit> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  const payload = creditToInsert(credit, userId);

  if (isUuid(credit.id)) {
    const { data, error } = await supabase
      .from('credits')
      .update(payload)
      .eq('id', credit.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapCreditRow(data as CreditRow);
  }

  const { data, error } = await supabase.from('credits').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return mapCreditRow(data as CreditRow);
}

export async function deleteCreditFromSupabase(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('credits').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertSubscriptionToSupabase(
  subscription: Subscription,
): Promise<Subscription> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  const payload = subscriptionToInsert(subscription, userId);

  if (isUuid(subscription.id)) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(payload)
      .eq('id', subscription.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapSubscriptionRow(data as SubscriptionRow);
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapSubscriptionRow(data as SubscriptionRow);
}

export async function deleteSubscriptionFromSupabase(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('subscriptions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function syncLocalLiabilitiesToSupabase(
  credits: Credit[],
  subscriptions: Subscription[],
): Promise<{ credits: Credit[]; subscriptions: Subscription[] }> {
  const syncedCredits: Credit[] = [];
  for (const credit of credits) {
    syncedCredits.push(await upsertCreditToSupabase(credit));
  }

  const syncedSubscriptions: Subscription[] = [];
  for (const subscription of subscriptions) {
    syncedSubscriptions.push(await upsertSubscriptionToSupabase(subscription));
  }

  return { credits: syncedCredits, subscriptions: syncedSubscriptions };
}
