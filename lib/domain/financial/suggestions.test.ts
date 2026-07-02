import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { Credit } from '@/lib/domain/types';

import {
  AMORTIZATION_SCENARIO_PERCENTS,
  buildFinancialSuggestions,
  DEFAULT_INVESTMENT_RETURN_PERCENT,
  FINANCIAL_SUGGESTION_DISCLAIMER,
  mapFinancialSuggestionsToHome,
} from '@/lib/domain/financial/suggestions';

function investmentAccount(
  partial: Pick<BankAccount, 'id' | 'name'> & Partial<Pick<BankAccount, 'initialBalance' | 'balance'>>,
): BankAccount {
  return {
    id: partial.id,
    name: partial.name,
    type: 'investment',
    initialBalance: partial.initialBalance ?? 0,
    balance: partial.balance,
    isActive: true,
    currency: 'EUR',
    budgetEnabled: false,
  };
}

const robinhood = investmentAccount({
  id: 'acc-rh',
  name: 'Robinhood',
  initialBalance: 7011.72,
  balance: 7011.72,
});

const credit: Credit = {
  id: 'loan-1',
  name: 'Crédito pessoal',
  outstandingBalance: 12000,
  interestRateAnnual: 11.29,
  monthlyPayment: 280,
  creditType: 'personal',
  termMonths: 60,
};

test('Robinhood 5% vs crédito 11,29% — sugere amortização parcial', () => {
  const items = buildFinancialSuggestions({
    accounts: [robinhood],
    credits: [credit],
    monthlyAvailable: 900,
    investmentReturnByAccountId: { 'acc-rh': 5 },
  });

  assert.ok(items.length >= 1);
  const primary = items[0];
  assert.equal(primary?.id, 'fin-amort-loan-1');
  assert.match(primary?.reason ?? '', /11,29|11\.29/);
  assert.match(primary?.reason ?? '', /5\.00/);
  assert.equal(primary?.disclaimer, FINANCIAL_SUGGESTION_DISCLAIMER);
  assert.ok((primary?.scenarios.length ?? 0) >= 1);

  for (const scenario of primary?.scenarios ?? []) {
    assert.ok(AMORTIZATION_SCENARIO_PERCENTS.includes(scenario.percent as 10 | 20 | 30));
    assert.ok(scenario.amount > 0);
    assert.ok(scenario.amount < robinhood.balance!);
    assert.ok(scenario.interestSaved > 0);
  }

  const mapped = mapFinancialSuggestionsToHome(items);
  assert.match(mapped[0]?.description ?? '', /não constitui aconselhamento financeiro/);
});

test('nunca sugere 100% do investimento — cenários parciais', () => {
  const items = buildFinancialSuggestions({
    accounts: [robinhood],
    credits: [credit],
    monthlyAvailable: 20_000,
    investmentReturnByAccountId: { 'acc-rh': 5 },
  });

  const primary = items.find((item) => item.id === 'fin-amort-loan-1');
  assert.ok(primary);
  const maxScenario = Math.max(...(primary?.scenarios.map((s) => s.amount) ?? [0]));
  assert.ok(maxScenario <= robinhood.balance! * 0.31);
});

test('sem investimento ou TAEG mais baixo — não sugere amortização vs investimento', () => {
  const lowRateCredit: Credit = {
    ...credit,
    id: 'loan-2',
    interestRateAnnual: 3.5,
  };

  const withoutInvestment = buildFinancialSuggestions({
    accounts: [],
    credits: [credit],
    monthlyAvailable: 1000,
  });
  assert.equal(
    withoutInvestment.some((item) => item.id.startsWith('fin-amort-')),
    false,
  );

  const withLowTaeg = buildFinancialSuggestions({
    accounts: [robinhood],
    credits: [lowRateCredit],
    monthlyAvailable: 1000,
    investmentReturnByAccountId: { 'acc-rh': 5 },
  });
  assert.equal(
    withLowTaeg.some((item) => item.id.startsWith('fin-amort-')),
    false,
  );
});

test('rendimento default 5% quando conta investimento não tem taxa explícita', () => {
  const items = buildFinancialSuggestions({
    accounts: [robinhood],
    credits: [credit],
    monthlyAvailable: 800,
  });

  const primary = items.find((item) => item.id === 'fin-amort-loan-1');
  assert.ok(primary);
  assert.match(primary?.dataUsed.join(' ') ?? '', /5\.00/);
  assert.equal(DEFAULT_INVESTMENT_RETURN_PERCENT, 5);
});
