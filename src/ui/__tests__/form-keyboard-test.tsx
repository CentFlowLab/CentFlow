import { act, fireEvent, screen } from '@testing-library/react-native';
import { DeviceEventEmitter, Keyboard, Platform } from 'react-native';

import { renderWithProviders } from '@/test-utils/render';

import { Button, FormScreen, TextField } from '../components';

// ADR-080: com o teclado aberto o rodapé esconde-se; no iPhone a barra do formulário (Concluído +
// ação principal) substitui a barra "Done" do sistema.

function Form({
  onSave = jest.fn(),
  disabled = false,
}: {
  onSave?: () => void;
  disabled?: boolean;
}) {
  return (
    <FormScreen
      title="Novo objetivo"
      closeLabel="Fechar"
      onClose={jest.fn()}
      keyboardAction={{ label: 'Guardar objetivo', onPress: onSave, disabled }}
      footer={<Button label="Guardar no rodapé" onPress={onSave} />}>
      <TextField label="Alvo" value="" onChangeText={jest.fn()} />
      <TextField label="Notas" value="" onChangeText={jest.fn()} inputAccessoryViewID="outra" />
    </FormScreen>
  );
}

const footer = () => screen.getByTestId('form-footer', { includeHiddenElements: true });
const keyboard = async (event: 'keyboardWillShow' | 'keyboardWillHide') => {
  await act(async () => {
    DeviceEventEmitter.emit(event, { endCoordinates: { height: 300, screenY: 500 } });
  });
};

describe('FormScreen keyboard (iPhone)', () => {
  it('hides the footer while the keyboard is open and brings it back after', async () => {
    await renderWithProviders(<Form />);
    expect(footer()).toBeVisible();
    await keyboard('keyboardWillShow');
    expect(footer()).toHaveStyle({ display: 'none' });
    await keyboard('keyboardWillHide');
    expect(footer()).not.toHaveStyle({ display: 'none' });
  });

  it('shows Concluído and the main action in the keyboard bar', async () => {
    await renderWithProviders(<Form />);
    expect(screen.queryByRole('button', { name: 'Concluído' })).toBeNull();
    await keyboard('keyboardWillShow');
    expect(screen.getByRole('button', { name: 'Concluído' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Guardar objetivo' })).toBeOnTheScreen();
  });

  it('closes the keyboard before running the main action', async () => {
    const calls: string[] = [];
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {
      calls.push('dismiss');
    });
    await renderWithProviders(<Form onSave={() => calls.push('save')} />);
    await keyboard('keyboardWillShow');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar objetivo' }));
    expect(calls).toEqual(['dismiss', 'save']);
    dismiss.mockRestore();
  });

  it('disables the main action when the form says so', async () => {
    await renderWithProviders(<Form disabled />);
    await keyboard('keyboardWillShow');
    expect(screen.getByRole('button', { name: 'Guardar objetivo' })).toBeDisabled();
  });

  it('gives the fields the form bar, unless a field asks for its own', async () => {
    await renderWithProviders(<Form />);
    const target = screen.getByLabelText('Alvo');
    expect(target.props.inputAccessoryViewID).toMatch(/^form-keyboard-/);
    expect(screen.getByLabelText('Notas').props.inputAccessoryViewID).toBe('outra');
  });

  it('a field outside a form gets no bar', async () => {
    await renderWithProviders(<TextField label="Pesquisa" value="" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText('Pesquisa').props.inputAccessoryViewID).toBeUndefined();
  });
});

describe('FormScreen keyboard (web)', () => {
  const original = Platform.OS;
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
  });
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
  });

  it('always shows the footer and adds no keyboard bar', async () => {
    await renderWithProviders(<Form />);
    await keyboard('keyboardWillShow');
    expect(footer()).not.toHaveStyle({ display: 'none' });
    expect(screen.queryByRole('button', { name: 'Concluído' })).toBeNull();
  });
});
