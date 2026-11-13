import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils/render';

import { AccountManagementScreen, matchesDeletePhrase } from '../AccountManagementScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() },
}));

jest.mock('../apple-sign-in', () => ({ isAppleSignInAvailable: async () => false }));

const user = { id: '7c4e3b2a-1f0d-4c8e-9a6b-2d1e0f3c4b5a', email: 'ana@exemplo.pt' };
const mockInvoke = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn(async () => undefined);
const mockClient = {
  auth: { getUser: async () => ({ data: { user: { ...user, app_metadata: {} } } }) },
  functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
};
const mockActions = {
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: () => mockSignOut(),
  reauthenticateWithApple: jest.fn(),
};
jest.mock('../AuthProvider', () => ({
  ...jest.requireActual('../AuthProvider'),
  useAuth: () => ({
    state: { status: 'signedIn', user },
    client: mockClient,
    actions: mockActions,
  }),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  mockInvoke.mockReset();
  mockSignIn.mockReset();
  mockSignOut.mockClear();
  mockPush.mockClear();
});

async function openDeletion() {
  await renderWithProviders(<AccountManagementScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar conta' }));
  expect(await screen.findByText('Ao eliminar a conta')).toBeOnTheScreen();
}

const confirmButton = () => screen.getByRole('button', { name: 'Eliminar conta definitivamente' });

describe('account management (ADR-068)', () => {
  it('offers the data export before anything else', async () => {
    await renderWithProviders(<AccountManagementScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Exportar dados' }));
    expect(mockPush).toHaveBeenCalledWith('/backup');
  });

  it('lists the consequences and requires the exact phrase before deleting', async () => {
    await openDeletion();
    expect(screen.getByText(/apagados do servidor/)).toBeOnTheScreen();
    expect(screen.getByText(/serviços externos/)).toBeOnTheScreen();
    expect(screen.getByText(/definitiva e não pode ser anulada/)).toBeOnTheScreen();

    expect(confirmButton()).toBeDisabled();
    await fireEvent.changeText(
      screen.getByLabelText('Para confirmar, escreve ELIMINAR CONTA'),
      'ELIMINAR CONTO',
    );
    expect(confirmButton()).toBeDisabled();
    expect(screen.getByText('O texto não corresponde.')).toBeOnTheScreen();
    await fireEvent.press(confirmButton());
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('does not delete when the password is wrong', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'invalidCredentials' });
    await openDeletion();
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'errada');
    await fireEvent.changeText(
      screen.getByLabelText('Para confirmar, escreve ELIMINAR CONTA'),
      'ELIMINAR CONTA',
    );
    await fireEvent.press(confirmButton());
    expect(
      await screen.findByText('A confirmação falhou. A conta não foi eliminada.'),
    ).toBeOnTheScreen();
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('keeps the account and explains when the server fails', async () => {
    mockSignIn.mockResolvedValue({ ok: true, value: undefined });
    mockInvoke.mockResolvedValue({ error: new Error('network') });
    await openDeletion();
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'certa');
    await fireEvent.changeText(
      screen.getByLabelText('Para confirmar, escreve ELIMINAR CONTA'),
      'eliminar conta ',
    );
    await fireEvent.press(confirmButton());
    expect(
      await screen.findByText(
        'Não foi possível eliminar a conta. Verifica a ligação e tenta novamente.',
      ),
    ).toBeOnTheScreen();
    expect(await AsyncStorage.getItem('centflow:account-deletion')).toBeNull();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('deletes after re-authentication, confirms it and then signs out', async () => {
    mockSignIn.mockResolvedValue({ ok: true, value: undefined });
    mockInvoke.mockResolvedValue({ error: null });
    await openDeletion();
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'certa');
    await fireEvent.changeText(
      screen.getByLabelText('Para confirmar, escreve ELIMINAR CONTA'),
      'ELIMINAR CONTA',
    );
    await fireEvent.press(confirmButton());

    expect(await screen.findByText('Conta eliminada')).toBeOnTheScreen();
    expect(mockSignIn).toHaveBeenCalledWith('ana@exemplo.pt', 'certa');
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', {
      method: 'POST',
      body: { confirm: 'DELETE' },
    });
    // A limpeza deste aparelho fica marcada antes de terminar a sessão (retoma se a app fechar).
    expect(JSON.parse((await AsyncStorage.getItem('centflow:account-deletion')) ?? '{}')).toEqual({
      userId: user.id,
      phase: 'local',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Terminar' }));
    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe('matchesDeletePhrase', () => {
  it('ignores case and surrounding spaces, nothing else', () => {
    expect(matchesDeletePhrase(' eliminar conta ', 'ELIMINAR CONTA')).toBe(true);
    expect(matchesDeletePhrase('ELIMINAR', 'ELIMINAR CONTA')).toBe(false);
    expect(matchesDeletePhrase('ELIMINARCONTA', 'ELIMINAR CONTA')).toBe(false);
  });
});
