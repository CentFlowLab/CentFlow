import { renderRouter, screen, fireEvent } from 'expo-router/testing-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.setTimeout(30_000);

describe('category icons', () => {
  beforeEach(() => AsyncStorage.setItem('centflow:onboarding:seen', '1'));

  it('groups the icons and finds tobacco by searching', async () => {
    await renderRouter('./src/app', { initialUrl: '/category/new' });
    expect(await screen.findByRole('header', { name: 'Alimentação' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'supermercado' })).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Procurar ícone'), 'Tabaco');
    const tobacco = await screen.findByRole('radio', { name: 'tabaco' });
    expect(screen.queryByRole('radio', { name: 'supermercado' })).toBeNull();
    await fireEvent.press(tobacco);
    expect(tobacco).toBeChecked();

    await fireEvent.changeText(screen.getByLabelText('Procurar ícone'), 'xyzzy');
    expect(screen.getByText('Nenhum ícone encontrado. Tenta outra palavra.')).toBeOnTheScreen();
  });
});
