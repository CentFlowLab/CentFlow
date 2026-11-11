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

/** Ícones das categorias por grupo (ADR-053). Pesquisa: `categoryIcons.keywords.*`. */
export const CATEGORY_ICON_GROUPS = [
  {
    id: 'home',
    icons: [
      'home-outline',
      'bed-outline',
      'key-outline',
      'hammer-outline',
      'construct-outline',
      'build-outline',
      'brush-outline',
      'color-fill-outline',
      'water-outline',
      'flash-outline',
      'flame-outline',
      'bulb-outline',
      'snow-outline',
      'thermometer-outline',
      'leaf-outline',
      'flower-outline',
      'trash-outline',
      'wifi-outline',
      'tv-outline',
    ],
  },
  {
    id: 'food',
    icons: [
      'cart-outline',
      'basket-outline',
      'storefront-outline',
      'restaurant-outline',
      'cafe-outline',
      'pizza-outline',
      'fast-food-outline',
      'ice-cream-outline',
      'nutrition-outline',
      'fish-outline',
      'egg-outline',
      'beer-outline',
      'wine-outline',
      'miven-cigarette',
    ],
  },
  {
    id: 'transport',
    icons: [
      'car-outline',
      'car-sport-outline',
      'miven-fuel',
      'speedometer-outline',
      'bus-outline',
      'train-outline',
      'subway-outline',
      'bicycle-outline',
      'walk-outline',
      'airplane-outline',
      'boat-outline',
      'navigate-outline',
      'map-outline',
      'globe-outline',
    ],
  },
  {
    id: 'health',
    icons: [
      'medkit-outline',
      'medical-outline',
      'bandage-outline',
      'fitness-outline',
      'barbell-outline',
      'heart-outline',
      'pulse-outline',
      'eye-outline',
      'glasses-outline',
      'body-outline',
      'cut-outline',
      'rose-outline',
    ],
  },
  {
    id: 'leisure',
    icons: [
      'film-outline',
      'game-controller-outline',
      'musical-notes-outline',
      'headset-outline',
      'ticket-outline',
      'football-outline',
      'basketball-outline',
      'tennisball-outline',
      'golf-outline',
      'camera-outline',
      'book-outline',
      'newspaper-outline',
      'dice-outline',
      'balloon-outline',
      'sparkles-outline',
      'paw-outline',
      'umbrella-outline',
      'planet-outline',
      'trophy-outline',
    ],
  },
  {
    id: 'shopping',
    icons: [
      'bag-handle-outline',
      'shirt-outline',
      'diamond-outline',
      'gift-outline',
      'watch-outline',
      'phone-portrait-outline',
      'laptop-outline',
      'desktop-outline',
      'print-outline',
      'cloud-outline',
    ],
  },
  {
    id: 'money',
    icons: [
      'cash-outline',
      'card-outline',
      'wallet-outline',
      'trending-up-outline',
      'briefcase-outline',
      'business-outline',
      'calculator-outline',
      'receipt-outline',
      'document-text-outline',
      'shield-checkmark-outline',
      'lock-closed-outline',
      'school-outline',
      'library-outline',
      'people-outline',
      'person-outline',
      'happy-outline',
      'medal-outline',
      'ribbon-outline',
      'ellipsis-horizontal',
    ],
  },
] as const satisfies readonly { id: string; icons: readonly IconName[] }[];

export type CategoryIconGroupId = (typeof CATEGORY_ICON_GROUPS)[number]['id'];

/** Todos os ícones das categorias, pela ordem dos grupos. */
export const CATEGORY_ICON_CHOICES: readonly IconName[] = CATEGORY_ICON_GROUPS.flatMap(
  (group) => group.icons,
);

/** Chave de tradução das palavras de pesquisa de um ícone (`home-outline` → `home`). */
export function categoryIconKeywordKey(icon: IconName): string {
  return icon
    .replace(/-outline$/, '')
    .replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase());
}
