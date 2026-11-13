import {
  bankErrorFromStatus,
  canRefreshBank,
  consentValidUntil,
  decimalToMinor,
  ibanLast4,
  parseAspsps,
  parseTransactions,
  pickBalance,
} from '../open-banking';

describe('open banking parsing (ADR-069)', () => {
  it('converts decimal strings to minor units without floats', () => {
    expect(decimalToMinor('1250.5', 'EUR')).toBe(125050);
    expect(decimalToMinor('-0.10', 'EUR')).toBe(-10);
    expect(decimalToMinor('0.1', 'EUR')).toBe(10);
    expect(decimalToMinor('1250.500', 'EUR')).toBe(125050);
    expect(decimalToMinor('12.345', 'EUR')).toBeNull(); // mais casas do que a moeda
    expect(decimalToMinor('1500', 'JPY')).toBe(1500);
    expect(decimalToMinor('1,50', 'EUR')).toBeNull();
    expect(decimalToMinor('10', 'XX')).toBeNull();
  });

  it('prefers the booked balance the app movements explain', () => {
    expect(
      pickBalance({
        balances: [
          { balance_type: 'CLAV', balance_amount: { amount: '900.00', currency: 'EUR' } },
          { balance_type: 'ITBD', balance_amount: { amount: '1000.00', currency: 'EUR' } },
        ],
      }),
    ).toEqual({ amount: 100000, currency: 'EUR', type: 'ITBD' });
    expect(pickBalance({ balances: [] })).toBeNull();
    expect(pickBalance(null)).toBeNull();
  });

  it('reads booked movements with the right type and a short description', () => {
    const parsed = parseTransactions({
      transactions: [
        {
          transaction_id: 't1',
          status: 'BOOK',
          credit_debit_indicator: 'DBIT',
          transaction_amount: { amount: '12.30', currency: 'EUR' },
          booking_date: '2026-11-12',
          creditor: { name: '  Pingo   Doce ' },
          remittance_information: ['COMPRA 1234'],
        },
        {
          entry_reference: 'r2',
          status: 'BOOK',
          credit_debit_indicator: 'CRDT',
          transaction_amount: { amount: '1500', currency: 'EUR' },
          value_date: '2026-11-10',
          remittance_information: ['Salário', 'Novembro'],
        },
        {
          status: 'PDNG',
          credit_debit_indicator: 'DBIT',
          transaction_amount: { amount: '5', currency: 'EUR' },
          booking_date: '2026-11-12',
        },
        {
          status: 'BOOK',
          transaction_amount: { amount: '-7.5', currency: 'EUR' },
          booking_date: '2026-11-11',
        },
        { status: 'BOOK', transaction_amount: { amount: '3', currency: 'EUR' } },
      ],
    });
    expect(parsed).toEqual([
      {
        id: 't1',
        date: '2026-11-12',
        amount: 1230,
        currency: 'EUR',
        type: 'expense',
        description: 'Pingo Doce',
      },
      {
        id: 'r2',
        date: '2026-11-10',
        amount: 150000,
        currency: 'EUR',
        type: 'income',
        description: 'Salário Novembro',
      },
      {
        id: null,
        date: '2026-11-11',
        amount: 750,
        currency: 'EUR',
        type: 'expense',
        description: '',
      },
    ]);
  });

  it('lists personal banks, sorted, with safe logos only', () => {
    expect(
      parseAspsps({
        aspsps: [
          {
            name: 'Revolut',
            country: 'PT',
            logo: 'https://x/r.png',
            maximum_consent_validity: 7776000,
            psu_types: ['personal', 'business'],
          },
          { name: 'Banco Empresas', country: 'PT', psu_types: ['business'] },
          { name: 'Moey!', country: 'PT', logo: 'http://insecure' },
        ],
      }),
    ).toEqual([
      { name: 'Moey!', country: 'PT', logo: null, maxConsentSeconds: null },
      { name: 'Revolut', country: 'PT', logo: 'https://x/r.png', maxConsentSeconds: 7776000 },
    ]);
  });

  it('asks for 90 days of consent or what the bank allows', () => {
    const now = Date.parse('2026-11-13T00:00:00Z');
    expect(consentValidUntil(null, now)).toBe('2027-02-10T23:59:00.000Z');
    expect(consentValidUntil(86_400, now)).toBe('2026-11-13T23:59:00.000Z');
  });

  it('maps errors, limits refreshes and shows only the end of the IBAN', () => {
    expect(bankErrorFromStatus(401)).toBe('unauthorized');
    expect(bankErrorFromStatus(429)).toBe('rateLimited');
    expect(bankErrorFromStatus(503)).toBe('unavailable');
    expect(bankErrorFromStatus(422)).toBe('invalid');
    const now = Date.parse('2026-11-13T12:00:00Z');
    expect(canRefreshBank(null, now)).toBe(true);
    expect(canRefreshBank('2026-11-13T11:50:00Z', now)).toBe(false);
    expect(canRefreshBank('2026-11-13T11:40:00Z', now)).toBe(true);
    expect(ibanLast4('PT50 0002 0123 1234 5678 9015 4')).toBe('0154');
    expect(ibanLast4('x')).toBeNull();
  });
});
