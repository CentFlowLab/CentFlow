import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { i18n } from '@/i18n';
import { renderWithProviders } from '@/test-utils/render';

import { SettingsScreen } from '../SettingsScreen';

afterEach(async () => {
  await i18n.changeLanguage('pt-PT');
});

describe('SettingsScreen', () => {
  it('persists the selected theme', async () => {
    const { repository } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Escuro' }));

    await waitFor(async () => {
      await expect(repository.load()).resolves.toMatchObject({ theme: 'dark' });
    });
    expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked();
  });

  it('switches the interface language immediately', async () => {
    const { repository } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'English' }));

    expect(await screen.findByRole('header', { name: 'Settings' })).toBeOnTheScreen();
    await expect(repository.load()).resolves.toMatchObject({ language: 'en' });
  });
});
