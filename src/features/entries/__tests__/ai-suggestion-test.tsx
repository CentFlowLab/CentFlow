import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils/render';

import { AiSuggestion } from '../AiSuggestion';

const mockInvoke = jest.fn();
let mockAuthState: { status: string; user?: { id: string } } = {
  status: 'signedIn',
  user: { id: 'u' },
};

jest.mock('../../account/AuthProvider', () => ({
  ...jest.requireActual('../../account/AuthProvider'),
  useAuth: () => ({
    state: mockAuthState,
    client: { functions: { invoke: mockInvoke } },
    actions: {},
  }),
}));

const categories = [
  { id: 'c1', name: 'Supermercado', type: 'expense' },
  { id: 'c2', name: 'Transferência', type: 'transfer' },
] as never;

describe('AiSuggestion', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockAuthState = { status: 'signedIn', user: { id: 'u' } };
  });

  it('is hidden without a session', async () => {
    mockAuthState = { status: 'signedOut' };
    await renderWithProviders(
      <AiSuggestion today="2026-11-09" categories={categories} onApply={jest.fn()} />,
    );
    expect(screen.queryByLabelText('Descreve o movimento (opcional)')).toBeNull();
  });

  it('sends only expense and income categories and hands the proposal to the form', async () => {
    const suggestion = {
      type: 'expense',
      amount: '23.50',
      date: '2026-11-08',
      description: 'Pingo Doce',
      categoryName: 'Supermercado',
    };
    mockInvoke.mockResolvedValue({ data: { suggestion }, error: null });
    const onApply = jest.fn();
    await renderWithProviders(
      <AiSuggestion today="2026-11-09" categories={categories} onApply={onApply} />,
    );
    await fireEvent.changeText(
      screen.getByLabelText('Descreve o movimento (opcional)'),
      'ontem Pingo Doce 23,50',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sugerir com IA' }));

    expect(await screen.findByText('Campos preenchidos. Revê e guarda.')).toBeOnTheScreen();
    expect(onApply).toHaveBeenCalledWith(suggestion);
    expect(mockInvoke).toHaveBeenCalledWith('suggest-entry', {
      method: 'POST',
      body: {
        text: 'ontem Pingo Doce 23,50',
        context: { today: '2026-11-09', categories: [{ name: 'Supermercado', type: 'expense' }] },
      },
    });
  });

  it('explains when the server has no AI key and does not touch the form', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { context: { status: 503 } } });
    const onApply = jest.fn();
    await renderWithProviders(
      <AiSuggestion today="2026-11-09" categories={categories} onApply={onApply} />,
    );
    await fireEvent.changeText(screen.getByLabelText('Descreve o movimento (opcional)'), 'café 1');
    await fireEvent.press(screen.getByRole('button', { name: 'Sugerir com IA' }));
    expect(await screen.findByText('A IA ainda não está ativa neste servidor.')).toBeOnTheScreen();
    expect(onApply).not.toHaveBeenCalled();
  });
});
