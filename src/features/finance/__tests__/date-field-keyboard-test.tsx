import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Keyboard } from 'react-native';

import { renderWithProviders } from '@/test-utils/render';
import { FormScreen, TextField } from '@/ui/components';

import { DateField } from '../DateField';

// ADR-080: o calendário nunca fica aberto escondido atrás do teclado de outro campo.
function Form() {
  const [date, setDate] = useState<string | null>('2026-11-13');
  return (
    <FormScreen title="Novo objetivo" closeLabel="Fechar" onClose={jest.fn()}>
      <TextField label="Alvo" value="" onChangeText={jest.fn()} />
      <DateField label="Data" value={date} today="2026-11-13" optional onChange={setDate} />
    </FormScreen>
  );
}

describe('date field inside a form', () => {
  it('closes the keyboard when the panel opens', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    await renderWithProviders(<Form />);
    await fireEvent.press(screen.getByRole('button', { name: /^Data: / }));
    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });

  it('closes the panel when another field of the form is focused', async () => {
    await renderWithProviders(<Form />);
    await fireEvent.press(screen.getByRole('button', { name: /^Data: / }));
    expect(screen.getByRole('button', { name: /^Data: / })).toBeExpanded();
    await fireEvent(screen.getByLabelText('Alvo'), 'focus');
    expect(screen.getByRole('button', { name: /^Data: / })).toBeCollapsed();
  });

  it('keeps the panel open while typing the day, month and year', async () => {
    await renderWithProviders(<Form />);
    await fireEvent.press(screen.getByRole('button', { name: /^Data: / }));
    const day = screen.getAllByLabelText(/Dia/)[0]!;
    await fireEvent(day, 'focus');
    expect(screen.getByRole('button', { name: /^Data: / })).toBeExpanded();
  });
});
