import type { LoanPaymentRecord } from '@/lib/domain/financial/loan-payments';
import { traceLoanPayment } from '@/lib/doctor/loan-payment-trace';

import type { TablesInsert } from './database.types';

import { getSupabaseClient } from './client';

type LoanPaymentRow = {
  id: string;
  user_id: string;
  credit_id: string;
  account_id: string | null;
  type: 'monthly_payment' | 'extra_principal_payment';
  amount: number;
  principal_amount: number | null;
  interest_amount: number | null;
  fees_amount: number | null;
  paid_at: string;
  note: string | null;
  created_at: string;
};

function mapRow(row: LoanPaymentRow): LoanPaymentRecord {
  return {
    id: row.id,
    creditId: row.credit_id,
    accountId: row.account_id,
    type: row.type,
    amount: Number(row.amount),
    principalAmount: row.principal_amount != null ? Number(row.principal_amount) : null,
    interestAmount: row.interest_amount != null ? Number(row.interest_amount) : null,
    feesAmount: row.fees_amount != null ? Number(row.fees_amount) : null,
    paidAt: row.paid_at,
    note: row.note,
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

export async function fetchLoanPayments(): Promise<LoanPaymentRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('loan_payments')
    .select('*')
    .order('paid_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as LoanPaymentRow));
}

export type CreateLoanPaymentInput = {
  creditId: string;
  accountId: string;
  type: 'monthly_payment' | 'extra_principal_payment';
  amount: number;
  principalAmount?: number;
  interestAmount?: number;
  feesAmount?: number;
  paidAt?: string;
  note?: string;
};

export async function createLoanPayment(
  input: CreateLoanPaymentInput,
): Promise<LoanPaymentRecord> {
  traceLoanPayment('service_start', {
    creditId: input.creditId,
    type: input.type,
    amount: input.amount,
  });

  const supabase = getSupabaseClient();
  const userId = await getUserId();

  const payload: TablesInsert<'loan_payments'> = {
    user_id: userId,
    credit_id: input.creditId,
    account_id: input.accountId,
    type: input.type,
    amount: input.amount,
    principal_amount: input.principalAmount ?? null,
    interest_amount: input.interestAmount ?? null,
    fees_amount: input.feesAmount ?? null,
    paid_at: input.paidAt ?? new Date().toISOString(),
    note: input.note ?? null,
  };

  const { data, error } = await supabase.from('loan_payments').insert(payload).select('*').single();

  if (error) {
    traceLoanPayment('service_insert_error', { code: error.code }, 'error');
    throw new Error(error.message);
  }

  traceLoanPayment('service_success', { id: data.id });
  return mapRow(data as LoanPaymentRow);
}
