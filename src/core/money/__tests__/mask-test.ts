import { formatMoney, HIDDEN_AMOUNT, maskMoneyText } from '..';

// Modo discreto (ADR-076): só a apresentação muda; o símbolo da moeda fica, o valor e o sinal não.
describe('maskMoneyText', () => {
  it('hides the digits and the sign but keeps the currency', () => {
    const eur = maskMoneyText(formatMoney({ amountMinor: -123456, currency: 'EUR' }, 'pt-PT'));
    expect(eur).toContain(HIDDEN_AMOUNT);
    expect(eur).toContain('€');
    expect(eur).not.toMatch(/\d|-|−/);

    const usd = maskMoneyText(formatMoney({ amountMinor: 987654321, currency: 'USD' }, 'en-US'));
    expect(usd).toBe(`$${HIDDEN_AMOUNT}`);

    const jpy = maskMoneyText(formatMoney({ amountMinor: 5000, currency: 'JPY' }, 'ja-JP'));
    expect(jpy).toContain(HIDDEN_AMOUNT);
    expect(jpy).not.toMatch(/\d/);
  });

  it('gives the same text for any amount', () => {
    const small = maskMoneyText(formatMoney({ amountMinor: 1, currency: 'EUR' }, 'pt-PT'));
    const large = maskMoneyText(
      formatMoney({ amountMinor: 12345678901, currency: 'EUR' }, 'pt-PT'),
    );
    expect(small).toBe(large);
  });
});
