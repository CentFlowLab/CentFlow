import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils/render';

import { MobileTabBar } from '../components/MobileTabBar';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

beforeEach(() => mockPush.mockClear());

describe('MobileTabBar (floating island)', () => {
  it('marks the active tab and selects the others by route', async () => {
    const onSelect = jest.fn();
    await renderWithProviders(<MobileTabBar activeRoute="index" onSelect={onSelect} />);
    expect(await screen.findByRole('tab', { name: 'Início' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Movimentos' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Movimentos' }));
    expect(onSelect).toHaveBeenCalledWith('transactions');
  });

  it('opens a new transaction from the "+" button', async () => {
    const onNew = jest.fn();
    await renderWithProviders(
      <MobileTabBar activeRoute="index" onSelect={jest.fn()} onNewTransaction={onNew} />,
    );
    await fireEvent.press(await screen.findByRole('button', { name: 'Novo movimento' }));
    expect(onNew).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/new-transaction');
  });

  it('highlights "Mais" on the secondary areas', async () => {
    await renderWithProviders(<MobileTabBar activeRoute="settings" onSelect={jest.fn()} />);
    expect(await screen.findByRole('tab', { name: 'Mais' })).toBeSelected();
    expect(screen.getByLabelText('Navegação principal')).toBeOnTheScreen();
  });
});
