import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { RepositoriesProvider, type Repositories } from '@/data';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';
import { renderWithProviders } from '@/test-utils/render';

import { VehicleDetailScreen } from '../VehicleDetailScreen';
import { VehicleForm } from '../VehicleForm';
import { VehiclesScreen } from '../VehiclesScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    back: jest.fn(),
    canGoBack: () => false,
  },
  useLocalSearchParams: () => mockParams,
}));
// Um "hoje" fixo: prazos e períodos não dependem do relógio da máquina.
jest.mock('../../finance/useToday', () => ({ useToday: () => '2026-11-13' }));

let db: Awaited<ReturnType<typeof openTestRepositories>>['db'];
let repos: Repositories;

beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
  mockPush.mockClear();
  mockReplace.mockClear();
  mockParams = {};
});
afterEach(() => db.close());

const render = (ui: React.ReactElement) =>
  renderWithProviders(<RepositoriesProvider repositories={repos}>{ui}</RepositoriesProvider>);

async function seed(fuelType: 'diesel' | 'electric' = 'diesel') {
  const bank = await repos.accounts.create({
    name: 'Cartão',
    type: 'bank',
    currency: 'EUR',
    initialBalance: 0,
  });
  const category = await repos.categories.create({
    name: 'Carro',
    type: 'expense',
    icon: 'car-outline',
    color: 'indigo',
  });
  const car = await repos.vehicles.create({
    name: 'Clio',
    kind: 'car',
    plate: '12-AB-34',
    odometerKm: 100000,
    inspectionDue: '2026-11-20',
    insuranceDue: '2027-03-01',
    make: 'Renault',
    model: 'Clio',
    year: 2019,
    fuelType,
    currency: 'EUR',
  });
  const expense = (
    date: string,
    amount: number,
    vehicleCostType: 'fuel' | 'tyres' | 'insurance',
    extra: { quantityMilli?: number; odometerKm?: number; description?: string } = {},
  ) =>
    repos.entries.create({
      type: 'expense',
      amount,
      description: extra.description ?? '',
      categoryId: category.id,
      accountId: bank.id,
      destinationAccountId: null,
      date,
      notes: null,
      vehicleId: car.id,
      vehicleCostType,
      quantityMilli: extra.quantityMilli ?? null,
      odometerKm: extra.odometerKm ?? null,
    });
  await expense('2026-11-02', 6000, 'fuel', { quantityMilli: 40000, odometerKm: 100500 });
  await expense('2026-10-05', 24000, 'tyres', { description: 'Pneus' });
  await expense('2026-03-10', 30000, 'insurance');
  await expense('2025-06-01', 5000, 'fuel', { quantityMilli: 30000, odometerKm: 99000 });
  return { car, bank, category };
}

describe('Optional date fields (vehicle form)', () => {
  it('stay closed, open one calendar at a time and close after picking a day', async () => {
    await render(<VehicleForm />);
    const insurance = await screen.findByRole('button', { name: 'Renovação do seguro: Sem data' });
    expect(screen.queryByRole('button', { name: 'Mês seguinte' })).toBeNull();

    await fireEvent.press(insurance);
    expect(screen.getAllByRole('button', { name: 'Mês seguinte' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /, escolher mês$/ })).toBeOnTheScreen();

    // Abrir outro fecha o primeiro.
    await fireEvent.press(screen.getByRole('button', { name: 'Próxima inspeção: Sem data' }));
    expect(screen.getAllByRole('button', { name: 'Mês seguinte' })).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Renovação do seguro: Sem data' }),
    ).not.toBeExpanded();

    await fireEvent.press(screen.getByRole('button', { name: '20 de novembro de 2026' }));
    expect(screen.queryByRole('button', { name: 'Mês seguinte' })).toBeNull();
    expect(
      screen.getByRole('button', {
        name: /^Próxima inspeção: 20\/11\/2026|^Próxima inspeção: 20 nov/,
      }),
    ).toBeOnTheScreen();
  });

  it('accepts a typed date and can be cleared again', async () => {
    await render(<VehicleForm />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Próximo IUC: Sem data' }));
    await fireEvent.changeText(screen.getByLabelText('Próximo IUC: Dia'), '15');
    await fireEvent.changeText(screen.getByLabelText('Próximo IUC: Mês'), '05');
    await fireEvent.changeText(screen.getByLabelText('Próximo IUC: Ano'), '2027');
    expect(
      screen.getByRole('button', { name: /^Próximo IUC: (15\/05\/2027|15 mai)/ }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Remover data' }));
    expect(screen.getByRole('button', { name: 'Próximo IUC: Sem data' })).toBeOnTheScreen();
  });
});

describe('Vehicle form', () => {
  it('creates a vehicle with the optional fields empty', async () => {
    await render(<VehicleForm />);
    await fireEvent.changeText(await screen.findByLabelText('Nome'), 'Mota');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar veículo' }));
    await waitFor(async () => expect(await repos.vehicles.list()).toHaveLength(1));
    const [saved] = await repos.vehicles.list();
    expect(saved).toMatchObject({
      name: 'Mota',
      plate: null,
      insuranceDue: null,
      inspectionDue: null,
      roadTaxDue: null,
      purchaseAmount: null,
      fuelType: null,
    });
  });

  it('edits a vehicle and keeps the fields it does not show', async () => {
    const { car } = await seed();
    await render(<VehicleForm vehicle={car} />);
    expect(await screen.findByRole('header', { name: 'Motorização' })).toBeOnTheScreen();
    expect(screen.getByText(/Abastecimentos em litros/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Elétrico' }));
    expect(screen.getByText(/Carregamentos em kWh/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar veículo' }));
    await waitFor(async () =>
      expect(await repos.vehicles.get(car.id)).toMatchObject({
        fuelType: 'electric',
        plate: '12-AB-34',
        insuranceDue: '2027-03-01',
      }),
    );
  });
});

describe('Vehicle sheet', () => {
  it('shows costs by period from the linked entries, without creating any', async () => {
    const { car } = await seed();
    mockParams = { id: car.id };
    const before = (await repos.entries.listForVehicle(car.id)).length;
    await render(<VehicleDetailScreen />);
    // Este ano: 60 + 240 + 300 = 600 €.
    expect((await screen.findAllByText(/600,00\s?€/)).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('radio', { name: 'Este mês' }));
    expect(screen.getAllByText(/60,00\s?€/).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('radio', { name: 'Sempre' }));
    expect(screen.getAllByText(/650,00\s?€/).length).toBeGreaterThan(0);
    expect((await repos.entries.listForVehicle(car.id)).length).toBe(before);
  });

  it('lists every obligation with its concrete date or says it is not set', async () => {
    const { car } = await seed();
    mockParams = { id: car.id };
    await render(<VehicleDetailScreen />);
    expect(await screen.findByText('Documentos e obrigações')).toBeOnTheScreen();
    expect(screen.getByText('Expira em 7 dias')).toBeOnTheScreen();
    expect(screen.getAllByText('Sem data definida')).toHaveLength(2);
    expect(screen.getAllByText(/^Até /)).toHaveLength(2);
  });

  it('filters the history by cost type and shows the cost type on each line', async () => {
    const { car } = await seed();
    mockParams = { id: car.id };
    await render(<VehicleDetailScreen />);
    expect(await screen.findByText('4 movimentos')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Pneus' }));
    expect(screen.getByText('1 movimento')).toBeOnTheScreen();
    expect(screen.getByText(/Cartão · Pneus · Carro/)).toBeOnTheScreen();
  });

  it('uses kWh for an electric vehicle and explains when data is missing', async () => {
    const { car } = await seed('electric');
    mockParams = { id: car.id };
    await render(<VehicleDetailScreen />);
    expect(await screen.findByText('Carregamentos')).toBeOnTheScreen();
    expect(screen.getByText(/kWh em 2 carregamentos/)).toBeOnTheScreen();
    expect(screen.getByText(/\/kWh$/)).toBeOnTheScreen();
  });
});

describe('Vehicles overview', () => {
  it('counts vehicles, adds this year per currency and lists the next obligations', async () => {
    await seed();
    await render(<VehiclesScreen />);
    expect(await screen.findByText('1 viatura')).toBeOnTheScreen();
    expect(screen.getAllByText(/600,00\s?€/).length).toBeGreaterThan(0);
    expect(screen.getByText('1 prazo a precisar de atenção')).toBeOnTheScreen();
    const upcoming = screen.getByRole('button', { name: /^Inspeção, Clio · / });
    expect(within(upcoming).getByText('Expira em 7 dias')).toBeOnTheScreen();
  });

  it('deleting a vehicle asks first and keeps its transactions', async () => {
    const { car } = await seed();
    await render(<VehiclesScreen />);
    await screen.findByText('1 viatura');
    // Ação de eliminar da linha (o deslizar no telemóvel): pede confirmação antes de apagar.
    let row: ReturnType<typeof screen.getByText> | null = screen.getByText('Clio', { exact: true });
    while (row && !row.props.accessibilityActions) row = row.parent;
    await fireEvent(row!, 'accessibilityAction', { nativeEvent: { actionName: 'action-1' } });
    expect(await screen.findByText('Eliminar este veículo?')).toBeOnTheScreen();
    expect(await repos.vehicles.list()).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar veículo' }));
    await waitFor(async () => expect(await repos.vehicles.list()).toHaveLength(0));
    const entries = (await repos.entries.list({})).items;
    expect(entries.filter((entry) => entry.amount === 24000)).toHaveLength(1);
    expect(entries.every((entry) => entry.vehicleId === null)).toBe(true);
    expect(car.id).toBeTruthy();
  });
});
