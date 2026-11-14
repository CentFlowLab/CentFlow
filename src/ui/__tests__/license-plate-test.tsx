import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils/render';

import { LicensePlate } from '../components';

describe('LicensePlate (ADR-078)', () => {
  it('shows the value in capitals only, with the country code for Portugal', async () => {
    await renderWithProviders(
      <LicensePlate value="50-xo-29" country="PT" accessibilityLabel="Matrícula 50-xo-29" />,
    );
    expect(screen.getByLabelText('Matrícula 50-xo-29')).toBeOnTheScreen();
    expect(screen.getByText('50-XO-29', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('P', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows only the stars without a country and never reformats the value', async () => {
    await renderWithProviders(
      <LicensePlate value="1234 abc" accessibilityLabel="Matrícula 1234 abc" />,
    );
    expect(screen.getByText('1234 ABC', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByText('P', { includeHiddenElements: true })).toBeNull();
  });
});
