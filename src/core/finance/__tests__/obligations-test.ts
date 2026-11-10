import type { VehicleKind } from '../types';
import { upcomingObligations, type ObligationsInput } from '../obligations';

const meta = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

function input(overrides: Partial<ObligationsInput> = {}): ObligationsInput {
  return {
    today: '2026-11-10',
    horizonDays: 45,
    vehicles: [],
    documents: [],
    subscriptions: [],
    hasProperty: false,
    ...overrides,
  };
}

describe('upcomingObligations', () => {
  it('joins vehicles, documents and subscriptions in date order, overdue included', () => {
    const items = upcomingObligations(
      input({
        vehicles: [
          {
            ...meta,
            id: 'v1',
            name: 'Carro',
            kind: 'car',
            plate: null,
            odometerKm: null,
            inspectionDue: '2026-11-20',
            insuranceDue: '2027-06-01',
          },
        ],
        documents: [
          {
            ...meta,
            id: 'd1',
            title: 'Cartão de Cidadão',
            category: 'identity',
            expiresOn: '2026-10-01',
            notes: null,
          },
        ],
        subscriptions: [
          {
            ...meta,
            id: 's1',
            name: 'Ginásio',
            amount: 3000,
            currency: 'EUR',
            period: 'monthly',
            status: 'active',
            startsOn: '2026-01-05',
            nextOn: '2026-01-05',
            categoryId: null,
            previousAmount: null,
            amountChangedOn: null,
          },
        ],
      }),
    );
    expect(items.map((item) => [item.kind, item.date])).toEqual([
      ['document', '2026-10-01'],
      ['inspection', '2026-11-20'],
      ['subscription', '2026-12-05'],
    ]);
  });

  it('shows IMI only with a property and the IRS during the filing period', () => {
    expect(upcomingObligations(input({ hasProperty: true })).map((item) => item.kind)).toEqual([
      'imi',
    ]);
    expect(upcomingObligations(input()).length).toBe(0);
    expect(upcomingObligations(input({ today: '2026-04-02' })).map((item) => item.date)).toEqual([
      '2026-06-30',
    ]);
    expect(upcomingObligations(input({ today: '2026-02-01' })).map((item) => item.kind)).toEqual([
      'efatura',
    ]);
    expect(
      upcomingObligations(input({ today: '2026-12-31', horizonDays: 60 })).map((item) => item.date),
    ).toEqual(['2027-03-01']);
  });

  it('moves the e-fatura deadline to the next working day', () => {
    // 28/02/2026 é sábado: passa para segunda, 2 de março.
    expect(upcomingObligations(input({ today: '2026-02-01' }))[0]?.date).toBe('2026-03-02');
    // 2028 é bissexto: 29/02/2028 é terça.
    expect(upcomingObligations(input({ today: '2028-02-01' }))[0]?.date).toBe('2028-02-29');
  });

  it('shows the fixed IUC dates from 2027 only to people with a motor vehicle', () => {
    const car = {
      ...meta,
      id: 'v1',
      name: 'Carro',
      kind: 'car' as VehicleKind,
      plate: null,
      odometerKm: null,
      inspectionDue: null,
      insuranceDue: null,
    };
    const iuc = (today: string, vehicles = [car]) =>
      upcomingObligations(input({ today, horizonDays: 100, vehicles }))
        .filter((item) => item.kind === 'iuc')
        .map((item) => item.date);
    expect(iuc('2026-11-10')).toEqual([]);
    expect(iuc('2027-07-25')).toEqual(['2027-07-31', '2027-10-31']);
    expect(iuc('2028-03-01')).toEqual(['2028-04-30']);
    expect(iuc('2028-03-01', [{ ...car, kind: 'bicycle' as const }])).toEqual([]);
  });
});
