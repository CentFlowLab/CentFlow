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
    ).toEqual(['2027-02-25']);
  });
});
