import type { TFunction } from 'i18next';

import type { AccountType, ValidationCode } from '@/core/finance';
import type { IconName } from '@/ui/components';

export const ACCOUNT_TYPE_ICONS: Record<AccountType, IconName> = {
  bank: 'business-outline',
  cash: 'cash-outline',
  savings: 'shield-checkmark-outline',
  card: 'card-outline',
  investment: 'trending-up-outline',
  custom: 'wallet-outline',
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  bank: 'indigo',
  cash: 'green',
  savings: 'teal',
  card: 'orange',
  investment: 'purple',
  custom: 'slate',
};

export function validationMessage(
  t: TFunction,
  code: ValidationCode | undefined,
): string | undefined {
  return code ? t(`validation.${code}`) : undefined;
}

/** Ícones disponíveis para categorias personalizadas. */
export const CATEGORY_ICON_CHOICES: readonly IconName[] = [
  'home-outline',
  'cart-outline',
  'restaurant-outline',
  'cafe-outline',
  'bus-outline',
  'car-outline',
  'airplane-outline',
  'medkit-outline',
  'fitness-outline',
  'film-outline',
  'game-controller-outline',
  'musical-notes-outline',
  'bag-handle-outline',
  'shirt-outline',
  'flash-outline',
  'wifi-outline',
  'phone-portrait-outline',
  'school-outline',
  'book-outline',
  'paw-outline',
  'gift-outline',
  'heart-outline',
  'briefcase-outline',
  'laptop-outline',
  'trending-up-outline',
  'cash-outline',
  'construct-outline',
  'people-outline',
  'happy-outline',
  'ellipsis-horizontal',
];
