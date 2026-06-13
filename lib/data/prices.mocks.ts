export type PriceChange = {
  id: string;
  product: string;
  category: string;
  previousPrice: number;
  currentPrice: number;
  changePercent: number;
  store: string;
  updatedAt: string;
};

export type PriceInsight = {
  id: string;
  title: string;
  description: string;
  tone: 'warning' | 'success' | 'neutral';
};

export type PricesData = {
  personalInflationPercent: number;
  basketAverageChange: number;
  trackedProducts: number;
  periodLabel: string;
  changes: PriceChange[];
  insights: PriceInsight[];
};

export const mockPricesData: PricesData = {
  personalInflationPercent: 4.2,
  basketAverageChange: 3.8,
  trackedProducts: 24,
  periodLabel: 'Últimos 30 dias',
  changes: [
    {
      id: 'p1',
      product: 'Leite Mimosa 1L',
      category: 'Alimentação',
      previousPrice: 0.89,
      currentPrice: 0.99,
      changePercent: 11.2,
      store: 'Continente',
      updatedAt: '2026-06-10',
    },
    {
      id: 'p2',
      product: 'Gasolina 95',
      category: 'Transportes',
      previousPrice: 1.72,
      currentPrice: 1.68,
      changePercent: -2.3,
      store: 'Galp',
      updatedAt: '2026-06-08',
    },
    {
      id: 'p3',
      product: 'Netflix Standard',
      category: 'Subscrições',
      previousPrice: 13.99,
      currentPrice: 15.99,
      changePercent: 14.3,
      store: 'Netflix',
      updatedAt: '2026-06-01',
    },
    {
      id: 'p4',
      product: 'Pão de forma',
      category: 'Alimentação',
      previousPrice: 1.19,
      currentPrice: 1.29,
      changePercent: 8.4,
      store: 'Pingo Doce',
      updatedAt: '2026-06-05',
    },
  ],
  insights: [
    {
      id: 'i1',
      title: 'Alimentação a subir',
      description: 'Os teus produtos de mercearia aumentaram 6,1% este mês.',
      tone: 'warning',
    },
    {
      id: 'i2',
      title: 'Combustível em queda',
      description: 'Poupaste cerca de 4€ em abastecimentos face ao mês passado.',
      tone: 'success',
    },
  ],
};
