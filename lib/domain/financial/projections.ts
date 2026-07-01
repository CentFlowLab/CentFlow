import type { NetWorthProjection } from '@/lib/domain/types';

import { addMoney, roundMoney } from './money';

export function buildNetWorthProjection(
  currentNetWorth: number,
  futureMovementsDelta: number,
): NetWorthProjection {
  return {
    netWorth: roundMoney(addMoney(currentNetWorth, futureMovementsDelta)),
    futureMovementsDelta: roundMoney(futureMovementsDelta),
  };
}
