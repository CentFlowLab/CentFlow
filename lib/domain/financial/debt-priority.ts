import { resolveEffectiveAnnualRate } from '@/lib/credit/credit-analysis';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import type { Credit } from '@/lib/domain/types';

/** Converte TAN mensal % (cartão) para taxa anual efectiva equivalente (decimal %). */
export function convertCardTanMonthlyToEffectiveAnnual(tanMonthlyPercent: number): number {
  if (tanMonthlyPercent <= 0) return 0;
  const monthly = tanMonthlyPercent / 100;
  return ((Math.pow(1 + monthly, 12) - 1) * 100);
}

/** Taxa anual comparável entre cartão (TAN mensal) e empréstimo (TAEG). Null se em falta. */
export function resolveDebtEffectiveAnnualRate(credit: Credit): number | null {
  if (isCardCredit(credit.creditType)) {
    const tan = credit.interestRateAnnual;
    if (tan !== undefined && tan > 0) {
      return convertCardTanMonthlyToEffectiveAnnual(tan);
    }
    return null;
  }

  const taeg = resolveEffectiveAnnualRate({
    outstandingBalance: credit.outstandingBalance,
    interestRateAnnual: credit.interestRateAnnual,
    indexRate: credit.indexRate,
    spread: credit.spread,
  });

  return taeg > 0 ? taeg : null;
}

function pickHighestBalance(credits: Credit[]): Credit | null {
  if (credits.length === 0) return null;
  return [...credits].sort((a, b) => b.outstandingBalance - a.outstandingBalance)[0];
}

/**
 * Escolhe a dívida a amortizar primeiro.
 * Com taxas completas em cartão e empréstimo → maior TAEG efectivo.
 * Se falta taxa em qualquer lado → cartão antes de empréstimo (sem simular TAEG).
 */
export function pickPriorityDebtTarget(credits: Credit[]): Credit | null {
  const withDebt = credits.filter((credit) => credit.outstandingBalance > 0);
  if (withDebt.length === 0) return null;
  if (withDebt.length === 1) return withDebt[0];

  const cards = withDebt.filter((credit) => isCardCredit(credit.creditType));
  const loans = withDebt.filter((credit) => !isCardCredit(credit.creditType));

  if (cards.length === 0) {
    const rated = loans
      .map((credit) => ({ credit, rate: resolveDebtEffectiveAnnualRate(credit) }))
      .filter((item) => item.rate !== null) as Array<{ credit: Credit; rate: number }>;

    if (rated.length === loans.length && rated.length > 0) {
      return rated.sort((a, b) => b.rate - a.rate)[0].credit;
    }
    return pickHighestBalance(loans);
  }

  if (loans.length === 0) {
    return pickHighestBalance(cards);
  }

  const cardRates = cards.map((credit) => ({
    credit,
    rate: resolveDebtEffectiveAnnualRate(credit),
  }));
  const loanRates = loans.map((credit) => ({
    credit,
    rate: resolveDebtEffectiveAnnualRate(credit),
  }));

  const allCardsRated = cardRates.every((item) => item.rate !== null);
  const allLoansRated = loanRates.every((item) => item.rate !== null);

  if (allCardsRated && allLoansRated) {
    const combined = [...cardRates, ...loanRates] as Array<{ credit: Credit; rate: number }>;
    return combined.sort((a, b) => b.rate - a.rate)[0].credit;
  }

  return pickHighestBalance(cards);
}
