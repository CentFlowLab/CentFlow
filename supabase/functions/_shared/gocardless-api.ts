const GOCARDLESS_BASE = 'https://bankaccountdata.gocardless.com/api/v2';

export type GoCardlessInstitution = {
  id: string;
  name: string;
  bic?: string;
  logo?: string;
};

export type GoCardlessRequisition = {
  id: string;
  status: string;
  link?: string;
  accounts: string[];
  institution_id: string;
};

export type GoCardlessAccountDetails = {
  iban?: string;
  name?: string;
  currency?: string;
};

export type GoCardlessTransaction = {
  transactionId?: string;
  internalTransactionId?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount?: { amount?: string; currency?: string };
  creditorName?: string;
  debtorName?: string;
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  /** Presente em movimentos ainda não contabilizados. */
  _pending?: boolean;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getGoCardlessAccessToken(
  secretId: string,
  secretKey: string,
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch(`${GOCARDLESS_BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GoCardless token failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const access = data.access as string;
  const expiresIn = Number(data.access_expires ?? 3600);
  cachedToken = { value: access, expiresAt: now + expiresIn * 1000 };
  return access;
}

async function gcFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GOCARDLESS_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`GoCardless ${path} failed: ${response.status} ${text}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

export function isGoCardlessRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = (error as Error & { status?: number }).status;
  if (status === 429) return true;
  return error.message.includes('429') || error.message.toLowerCase().includes('rate limit');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listInstitutions(
  token: string,
  country = 'PT',
): Promise<GoCardlessInstitution[]> {
  const data = await gcFetch<GoCardlessInstitution[]>(
    token,
    `/institutions/?country=${encodeURIComponent(country)}`,
  );
  return [...data].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
}

export async function createRequisition(
  token: string,
  input: {
    institutionId: string;
    redirect: string;
    reference: string;
  },
): Promise<GoCardlessRequisition> {
  return gcFetch<GoCardlessRequisition>(token, '/requisitions/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      institution_id: input.institutionId,
      redirect: input.redirect,
      reference: input.reference,
      user_language: 'PT',
      account_selection: false,
      redirect_immediate: false,
    }),
  });
}

export async function getRequisition(
  token: string,
  requisitionId: string,
): Promise<GoCardlessRequisition> {
  return gcFetch<GoCardlessRequisition>(token, `/requisitions/${requisitionId}/`);
}

export async function deleteRequisition(token: string, requisitionId: string): Promise<void> {
  const response = await fetch(`${GOCARDLESS_BASE}/requisitions/${requisitionId}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`GoCardless delete requisition failed: ${response.status} ${text}`);
  }
}

export async function getAccountDetails(
  token: string,
  accountId: string,
): Promise<GoCardlessAccountDetails> {
  const data = await gcFetch<{ account?: GoCardlessAccountDetails }>(
    token,
    `/accounts/${accountId}/details/`,
  );
  return data.account ?? {};
}

export async function getAccountTransactions(
  token: string,
  accountId: string,
): Promise<GoCardlessTransaction[]> {
  const data = await gcFetch<{
    transactions?: { booked?: GoCardlessTransaction[]; pending?: GoCardlessTransaction[] };
  }>(token, `/accounts/${accountId}/transactions/`);
  const booked = (data.transactions?.booked ?? []).map((tx) => ({ ...tx, _pending: false }));
  const pending = (data.transactions?.pending ?? []).map((tx) => ({ ...tx, _pending: true }));
  return [...booked, ...pending];
}

export function mapRequisitionStatus(status: string): 'pending' | 'linked' | 'expired' | 'error' {
  if (status === 'LN' || status === 'linked') return 'linked';
  if (status === 'EX' || status === 'expired') return 'expired';
  if (status === 'CR' || status === 'GC' || status === 'UA' || status === 'SA') return 'pending';
  return 'error';
}

export function extractTransactionDescription(tx: GoCardlessTransaction): string {
  const remittance = tx.remittanceInformationUnstructured?.trim();
  if (remittance) return remittance;
  const arrayText = tx.remittanceInformationUnstructuredArray?.filter(Boolean).join(' ').trim();
  if (arrayText) return arrayText;
  return tx.creditorName?.trim() || tx.debtorName?.trim() || 'Movimento bancário';
}

export function mapGoCardlessAmount(tx: GoCardlessTransaction): {
  type: 'expense' | 'income';
  amount: number;
} {
  const raw = Number(tx.transactionAmount?.amount ?? 0);
  if (raw < 0) return { type: 'expense', amount: Math.abs(raw) };
  if (raw > 0) return { type: 'income', amount: raw };
  return { type: 'expense', amount: 0 };
}

export function resolveTransactionDate(tx: GoCardlessTransaction): string {
  return (tx.bookingDate ?? tx.valueDate ?? new Date().toISOString()).slice(0, 10);
}

export function buildExternalId(accountId: string, tx: GoCardlessTransaction): string {
  const id = tx.transactionId ?? tx.internalTransactionId;
  if (!id) {
    const date = resolveTransactionDate(tx);
    const amount = tx.transactionAmount?.amount ?? '0';
    const desc = extractTransactionDescription(tx).slice(0, 40);
    const prefix = tx._pending ? 'gc:pending' : 'gc';
    return `${prefix}:${accountId}:${date}:${amount}:${desc}`;
  }
  const prefix = tx._pending ? 'gc:pending' : 'gc';
  return `${prefix}:${accountId}:${id}`;
}

/** ID estável quando um movimento pending passa a booked (mesmo transactionId). */
export function buildBookedExternalId(accountId: string, tx: GoCardlessTransaction): string | null {
  const id = tx.transactionId ?? tx.internalTransactionId;
  if (!id) return null;
  return `gc:${accountId}:${id}`;
}
