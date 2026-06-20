import { SUBSCRIPTION_RENEWAL_ALERT_DAYS } from './renewal.constants';

export type RenewalStatusTone = 'default' | 'warning' | 'danger';

export type RenewalStatus = {
  label: string;
  tone: RenewalStatusTone;
  diffDays: number | null;
};

export function daysUntilRenewal(renewsAt: string, asOf: Date = new Date()): number {
  const renewDate = new Date(renewsAt);
  return Math.ceil((renewDate.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24));
}

export function getRenewalStatus(
  renewsAt?: string,
  asOf: Date = new Date(),
  alertDays: number = SUBSCRIPTION_RENEWAL_ALERT_DAYS,
): RenewalStatus {
  if (!renewsAt) {
    return { label: 'Activa', tone: 'default', diffDays: null };
  }

  const diffDays = daysUntilRenewal(renewsAt, asOf);

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return {
      label: overdue === 1 ? 'Renovação em atraso (1d)' : `Renovação em atraso (${overdue}d)`,
      tone: 'danger',
      diffDays,
    };
  }

  if (diffDays === 0) {
    return { label: 'Renova hoje', tone: 'warning', diffDays };
  }

  if (diffDays <= alertDays) {
    return { label: `Renova em ${diffDays}d`, tone: 'warning', diffDays };
  }

  return { label: 'Activa', tone: 'default', diffDays };
}

export function countRenewalsSoon(
  subscriptions: Array<{ renewsAt?: string }>,
  asOf: Date = new Date(),
  withinDays: number = SUBSCRIPTION_RENEWAL_ALERT_DAYS,
): number {
  const now = asOf.getTime();
  const limit = now + withinDays * 24 * 60 * 60 * 1000;

  return subscriptions.filter((sub) => {
    if (!sub.renewsAt) return false;
    const time = new Date(sub.renewsAt).getTime();
    return time >= now && time <= limit;
  }).length;
}

export function isRenewalWithinAlert(
  renewsAt: string,
  asOf: Date = new Date(),
  withinDays: number = SUBSCRIPTION_RENEWAL_ALERT_DAYS,
): boolean {
  const diffDays = daysUntilRenewal(renewsAt, asOf);
  return diffDays >= 0 && diffDays <= withinDays;
}
