import type {
  BankAccount,
  CreateAccountInput,
  UpdateAccountInput,
} from '@/lib/domain/account.types';

let store: BankAccount[] = buildSeedAccounts();
let idCounter = store.length + 1;

function buildSeedAccounts(): BankAccount[] {
  return [
    {
      id: 'mock-acc-1',
      name: 'Conta CGD',
      type: 'checking',
      bank: 'CGD',
      color: '#2DD4BF',
      icon: '🏦',
      initialBalance: 930,
      isActive: true,
      currency: 'EUR',
    },
    {
      id: 'mock-acc-2',
      name: 'Conta Millennium',
      type: 'savings',
      bank: 'Millennium BCP',
      color: '#38BDF8',
      icon: '🏦',
      initialBalance: 4800,
      isActive: true,
      currency: 'EUR',
    },
    {
      id: 'mock-acc-3',
      name: 'Carteira',
      type: 'wallet',
      icon: '💳',
      color: '#FBBF24',
      initialBalance: 130,
      isActive: true,
      currency: 'EUR',
    },
  ];
}

function nextId(): string {
  idCounter += 1;
  return `mock-acc-${idCounter}`;
}

export async function fetchMockAccounts(): Promise<BankAccount[]> {
  await new Promise((r) => setTimeout(r, 150));
  return [...store].filter((a) => a.isActive);
}

export async function createMockAccount(input: CreateAccountInput): Promise<BankAccount> {
  await new Promise((r) => setTimeout(r, 200));
  const account: BankAccount = {
    id: nextId(),
    name: input.name.trim(),
    type: input.type,
    bank: input.bank?.trim() || undefined,
    color: input.color,
    icon: input.icon ?? '🏦',
    initialBalance: input.initialBalance ?? 0,
    isActive: true,
    currency: 'EUR',
  };
  store = [account, ...store];
  return account;
}

export async function updateMockAccount(
  id: string,
  input: UpdateAccountInput,
): Promise<BankAccount> {
  await new Promise((r) => setTimeout(r, 200));
  const existing = store.find((a) => a.id === id);
  if (!existing) throw new Error('Conta não encontrada');

  const updated: BankAccount = {
    ...existing,
    name: input.name?.trim() ?? existing.name,
    type: input.type ?? existing.type,
    bank: input.bank !== undefined ? input.bank.trim() || undefined : existing.bank,
    color: input.color ?? existing.color,
    icon: input.icon ?? existing.icon,
    initialBalance: input.initialBalance ?? existing.initialBalance,
    isActive: input.isActive ?? existing.isActive,
  };

  store = store.map((a) => (a.id === id ? updated : a));
  return updated;
}

export async function deleteMockAccount(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
  store = store.map((a) => (a.id === id ? { ...a, isActive: false } : a));
}

/** Expõe store para testes. */
export function __resetMockAccountsForTests() {
  store = buildSeedAccounts();
  idCounter = store.length + 1;
}
