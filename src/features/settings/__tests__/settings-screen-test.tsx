import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { i18n } from '@/i18n';
import { renderWithProviders } from '@/test-utils/render';

import { SettingsScreen } from '../SettingsScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

let mockBreakpoint: 'compact' | 'medium' | 'expanded' = 'compact';
jest.mock('@/ui/layout/useBreakpoint', () => ({
  ...jest.requireActual('@/ui/layout/useBreakpoint'),
  useBreakpoint: () => mockBreakpoint,
}));

beforeEach(() => {
  mockBreakpoint = 'compact';
  mockPush.mockClear();
});

afterEach(async () => {
  await i18n.changeLanguage('pt-PT');
});

describe('Settings navigation', () => {
  it('lists the sections on a phone, each with its current state, and opens one', async () => {
    await renderWithProviders(<SettingsScreen />);
    for (const title of [
      'Conta e segurança',
      'Preferências',
      'Dados e sincronização',
      'Integrações',
      'Ajuda e suporte',
      'Sobre a Miven',
    ]) {
      expect(
        await screen.findByRole('button', { name: new RegExp(`^${title}`) }),
      ).toBeOnTheScreen();
    }
    // O estado atual à vista sem abrir a secção.
    expect(
      screen.getByRole('button', { name: /^Preferências, Claro · Português/ }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Preferências/ }));
    expect(mockPush).toHaveBeenCalledWith('/settings/preferences');
  });

  it('opens a section on its own page on a phone, with a way back', async () => {
    await renderWithProviders(<SettingsScreen section="about" />);
    expect(await screen.findByRole('header', { name: 'Sobre a Miven' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voltar às definições' })).toBeOnTheScreen();
    expect(screen.getByText('Versão')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Preferências' })).toBeNull();
  });

  it('shows a side navigation and the chosen section next to it on desktop', async () => {
    mockBreakpoint = 'expanded';
    await renderWithProviders(<SettingsScreen section="data" />);
    const current = await screen.findByRole('link', { name: 'Dados e sincronização' });
    expect(current.props['aria-current']).toBe('page');
    expect(
      screen.getByRole('link', { name: 'Preferências' }).props['aria-current'],
    ).toBeUndefined();
    expect(screen.getByRole('header', { name: 'Dados e sincronização' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Exportar e restaurar/ })).toBeOnTheScreen();
  });

  it('opens the account section by default on desktop', async () => {
    mockBreakpoint = 'expanded';
    await renderWithProviders(<SettingsScreen />);
    const account = await screen.findByRole('link', { name: 'Conta e segurança' });
    expect(account.props['aria-current']).toBe('page');
    expect(screen.getByRole('header', { name: 'Conta e segurança' })).toBeOnTheScreen();
  });
});

describe('Preferences', () => {
  it('persists the selected theme and marks it', async () => {
    const { repository } = await renderWithProviders(<SettingsScreen section="preferences" />);
    expect(await screen.findByRole('radio', { name: 'Claro' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Escuro' }));
    await waitFor(async () => {
      await expect(repository.load()).resolves.toMatchObject({ theme: 'dark' });
    });
    expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked();
  });

  it('switches the interface language immediately and keeps it', async () => {
    const { repository } = await renderWithProviders(<SettingsScreen section="preferences" />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'English' }));
    expect(await screen.findByRole('header', { name: 'Preferences' })).toBeOnTheScreen();
    await expect(repository.load()).resolves.toMatchObject({ language: 'en' });
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
  });

  it('shows the number and date formats of the region', async () => {
    await renderWithProviders(<SettingsScreen section="preferences" />);
    expect(await screen.findByText('Números e moedas')).toBeOnTheScreen();
    expect(screen.getByText(/1234,56\s?€/)).toBeOnTheScreen();
  });

  it('opens the quick entry steps in place on iPhone', async () => {
    await renderWithProviders(<SettingsScreen section="preferences" />);
    // Os testes correm como iOS.
    await fireEvent.press(await screen.findByRole('button', { name: /^Registo rápido/ }));
    expect(screen.getByText(/Abre a app Atalhos e toca em \+/)).toBeOnTheScreen();
  });
});

describe('Help, about and integrations', () => {
  it('opens the help centre and a help topic on the support page', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderWithProviders(<SettingsScreen section="help" />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Centro de ajuda/ }));
    expect(open).toHaveBeenCalledWith('https://miven.pt/suporte/');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Quando entram os movimentos dos bancos' }),
    );
    expect(open).toHaveBeenCalledWith('https://miven.pt/suporte/#bancos');
    open.mockRestore();
  });

  it('shows the installed version and the legal pages', async () => {
    await renderWithProviders(<SettingsScreen section="about" />);
    expect(
      await screen.findByRole('button', { name: 'Política de privacidade' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Termos de utilização' })).toBeOnTheScreen();
    expect(screen.getByText('Plataforma')).toBeOnTheScreen();
  });

  it('asks to sign in before showing integrations', async () => {
    await renderWithProviders(<SettingsScreen section="integrations" />);
    expect(
      await screen.findByText('Entra na tua conta para ligar bancos e a Trading 212.'),
    ).toBeOnTheScreen();
  });
});
