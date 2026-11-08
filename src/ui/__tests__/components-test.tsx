import { fireEvent, screen } from '@testing-library/react-native';

import { money } from '@/core/money';
import { renderWithProviders } from '@/test-utils/render';

import { Amount, Button, EmptyState, ProgressBar, SegmentedControl } from '../components';
import { lightColors } from '../theme/colors';

describe('Button', () => {
  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Guardar" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress while loading', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Guardar" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Amount', () => {
  it('formats with the active locale (pt-PT)', async () => {
    await renderWithProviders(<Amount value={money(123456, 'EUR')} />);
    expect(screen.getByText(/^1234,56\s€$/)).toBeOnTheScreen();
  });

  it('colours signed amounts', async () => {
    await renderWithProviders(
      <>
        <Amount value={money(500, 'EUR')} coloring="signed" />
        <Amount value={money(-500, 'EUR')} coloring="signed" />
      </>,
    );
    expect(screen.getByText(/^\+5,00\s€$/)).toHaveStyle({
      color: lightColors.positive,
    });
    expect(screen.getByText(/^-5,00\s€$/)).toHaveStyle({
      color: lightColors.negative,
    });
  });
});

describe('SegmentedControl', () => {
  it('reports the selected option', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <SegmentedControl
        accessibilityLabel="Tema"
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'Opção A' },
          { value: 'b', label: 'Opção B' },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Opção A' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Opção B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('ProgressBar', () => {
  it('clamps the value and exposes it to assistive technology', async () => {
    await renderWithProviders(<ProgressBar progress={1.4} accessibilityLabel="Orçamento" />);
    expect(screen.getByRole('progressbar', { name: 'Orçamento' })).toHaveAccessibilityValue({
      now: 100,
    });
  });
});

describe('EmptyState', () => {
  it('renders title, description and children', async () => {
    await renderWithProviders(
      <EmptyState icon="wallet-outline" title="Sem contas" description="Cria a primeira conta.">
        <Button label="Criar conta" />
      </EmptyState>,
    );
    expect(screen.getByRole('header', { name: 'Sem contas' })).toBeOnTheScreen();
    expect(screen.getByText('Cria a primeira conta.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeOnTheScreen();
  });
});
