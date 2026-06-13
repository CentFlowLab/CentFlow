import { colors } from '@/lib/theme';
import { daysUntil, formatRelativeDays } from '@/lib/utils/format';

export const WARRANTY_CRITICAL_DAYS = 30;
export const WARRANTY_WARNING_DAYS = 90;

export type WarrantyExpiryStatus = 'expired' | 'critical' | 'warning' | 'ok';

export type WarrantyExpiryInfo = {
  status: WarrantyExpiryStatus;
  daysLeft: number;
  label: string;
  color: string;
};

export function getWarrantyExpiryInfo(expiresAt: string): WarrantyExpiryInfo {
  const daysLeft = daysUntil(expiresAt);

  if (daysLeft < 0) {
    return {
      status: 'expired',
      daysLeft,
      label: 'Expirada',
      color: colors.danger,
    };
  }

  if (daysLeft <= WARRANTY_CRITICAL_DAYS) {
    return {
      status: 'critical',
      daysLeft,
      label: `Expira em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}`,
      color: colors.danger,
    };
  }

  if (daysLeft <= WARRANTY_WARNING_DAYS) {
    return {
      status: 'warning',
      daysLeft,
      label: formatRelativeDays(daysLeft),
      color: colors.warning,
    };
  }

  return {
    status: 'ok',
    daysLeft,
    label: 'Válida',
    color: colors.success,
  };
}

export function getWarrantiesSummary(warranties: Array<{ expiresAt: string }>) {
  const expiringSoon = warranties.filter(
    (w) => {
      const days = daysUntil(w.expiresAt);
      return days >= 0 && days <= WARRANTY_CRITICAL_DAYS;
    },
  ).length;

  const expired = warranties.filter((w) => daysUntil(w.expiresAt) < 0).length;

  return {
    total: warranties.length,
    expiringSoon,
    expired,
  };
}
