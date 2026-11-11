import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { i18n } from '@/i18n';
import { renderWithProviders } from '@/test-utils/render';

import { SettingsScreen } from '../SettingsScreen';

afterEach(async () => {
  await i18n.changeLanguage('pt-PT');
});

describe('SettingsScreen', () => {
  it('groups the options and shows the current values at a glance', async () => {
    await renderWithProviders(<SettingsScreen />);
    expect(await screen.findByRole('header', { name: 'Personalização' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Ajuda e informação' })).toBeOnTheScreen();
    // Idioma atual visível sem abrir nada; a lista só aparece ao tocar.
    expect(screen.getByRole('button', { name: 'Idioma' })).toBeCollapsed();
    expect(screen.getByText('Português')).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'English' })).toBeNull();
    // Aparência: escolha direta, com a opção atual marcada.
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();
    expect(screen.getByText('Versão')).toBeOnTheScreen();
  });

  it('opens the help page from the help group', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Ajuda' }));
    expect(open).toHaveBeenCalledWith('https://miven.pt/suporte/');
    open.mockRestore();
  });

  it('persists the selected theme', async () => {
    const { repository } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Escuro' }));

    await waitFor(async () => {
      await expect(repository.load()).resolves.toMatchObject({ theme: 'dark' });
    });
    expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked();
  });

  it('switches the interface language immediately from the inline list', async () => {
    const { repository } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Idioma' }));
    expect(screen.getByRole('button', { name: 'Idioma' })).toBeExpanded();
    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));

    expect(await screen.findByRole('header', { name: 'Settings' })).toBeOnTheScreen();
    await expect(repository.load()).resolves.toMatchObject({ language: 'en' });
    // Escolhido o idioma, a lista fecha e mostra o novo valor.
    expect(screen.queryByRole('radio', { name: 'Español' })).toBeNull();
    expect(screen.getByText('English')).toBeOnTheScreen();
  });

  it('opens the quick entry steps in place on iPhone', async () => {
    await renderWithProviders(<SettingsScreen />);
    // Os testes correm como iOS.
    await fireEvent.press(await screen.findByRole('button', { name: /^Registo rápido/ }));
    expect(screen.getByText(/Abre a app Atalhos e toca em \+/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Abrir a app Atalhos' })).toBeOnTheScreen();
  });
});
