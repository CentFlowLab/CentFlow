import type { CreditType } from '@/lib/domain/types';

export const CREDIT_TYPE_OPTIONS: Array<{ key: CreditType; label: string }> = [
  { key: 'personal', label: 'Pessoal' },
  { key: 'mortgage', label: 'Habitação' },
  { key: 'auto', label: 'Automóvel' },
  { key: 'student', label: 'Estudante' },
  { key: 'other', label: 'Outro' },
];

const AUTO_NAMES: Record<Exclude<CreditType, 'other'>, string> = {
  personal: 'Crédito pessoal',
  mortgage: 'Crédito habitação',
  auto: 'Crédito automóvel',
  student: 'Crédito estudante',
};

export function isPredefinedCreditType(type: CreditType): type is Exclude<CreditType, 'other'> {
  return type !== 'other';
}

export function getAutoCreditName(type: Exclude<CreditType, 'other'>): string {
  return AUTO_NAMES[type];
}

/** Resolve o nome final a guardar com base no tipo seleccionado. */
export function resolveCreditName(type: CreditType, customName?: string): string {
  if (type === 'other') {
    return customName?.trim() ?? '';
  }
  return AUTO_NAMES[type];
}

export function inferCreditTypeFromName(name: string): CreditType {
  const normalized = name.trim().toLowerCase();
  for (const option of CREDIT_TYPE_OPTIONS) {
    if (option.key !== 'other' && getAutoCreditName(option.key).toLowerCase() === normalized) {
      return option.key;
    }
  }
  return 'other';
}
