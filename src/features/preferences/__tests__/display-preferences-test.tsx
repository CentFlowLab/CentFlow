import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useLocaleFormat } from '@/i18n';
import { renderWithProviders } from '@/test-utils/render';
import { Amount } from '@/ui/components';

// Preferências de apresentação (ADR-076): só mudam o que se vê, nunca os valores guardados.

function Sample() {
  const { formatMoney, formatPercent } = useLocaleFormat();
  return (
    <>
      <Text testID="money">{formatMoney({ amountMinor: 123456, currency: 'EUR' })}</Text>
      <Text testID="percent">{formatPercent(0.25)}</Text>
    </>
  );
}

describe('display preferences', () => {
  it('formats with the language region by default', async () => {
    await renderWithProviders(<Sample />);
    expect(screen.getByTestId('money')).toHaveTextContent(/^1234,56\s?€$|^1\s?234,56\s?€$/);
  });

  it('uses the chosen regional format, independent of the language', async () => {
    await renderWithProviders(<Sample />, { preferences: { formatRegion: 'en-US' } });
    expect(screen.getByTestId('money')).toHaveTextContent('€1,234.56');
    expect(screen.getByTestId('percent')).toHaveTextContent('25%');
  });

  it('hides money in discreet mode but keeps percentages', async () => {
    await renderWithProviders(<Sample />, { preferences: { discreetAmounts: true } });
    expect(screen.getByTestId('money')).toHaveTextContent(/^••••\s?€$/);
    expect(screen.getByTestId('percent')).toHaveTextContent(/25\s?%/);
  });

  it('tells screen readers the value is hidden', async () => {
    await renderWithProviders(<Amount value={{ amountMinor: -500, currency: 'EUR' }} />, {
      preferences: { discreetAmounts: true },
    });
    expect(screen.getByLabelText('Valor oculto')).toBeOnTheScreen();
    expect(screen.queryByText(/5,00/)).toBeNull();
  });
});
