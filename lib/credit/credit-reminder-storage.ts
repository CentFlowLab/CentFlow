import { readUserJson, writeUserJson } from '@/lib/storage/local-flags';

const SCOPE = 'credit_reminders';

export type CreditReminderEntry = {
  /** Data de pagamento (YYYY-MM-DD) já resolvida — evita repetir o alerta no mesmo ciclo. */
  handledDate?: string;
  /** Adiamento até esta data (YYYY-MM-DD), inclusive. */
  snoozedUntil?: string;
};

export type CreditReminderState = Record<string, CreditReminderEntry>;

export async function loadCreditReminderState(userId: string): Promise<CreditReminderState> {
  return (await readUserJson<CreditReminderState>(SCOPE, userId)) ?? {};
}

export async function saveCreditReminderState(
  userId: string,
  state: CreditReminderState,
): Promise<void> {
  await writeUserJson<CreditReminderState>(SCOPE, userId, state);
}
