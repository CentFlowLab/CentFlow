import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

jest.setTimeout(60_000);

beforeEach(() => AsyncStorage.setItem('centflow:onboarding:seen', '1'));

const handles = () =>
  screen
    .getAllByRole('adjustable')
    .map((node) => String(node.props.accessibilityLabel).replace('Arrastar ', ''));

describe('category order (drag and drop)', () => {
  it('moves a category with the drag handle accessibility action and keeps the new order', async () => {
    await renderRouter('./src/app', { initialUrl: '/categories' });
    await fireEvent.press(await screen.findByRole('button', { name: 'Ordenar' }));
    const before = handles();
    expect(before.length).toBeGreaterThan(2);

    // Leitor de ecrã: "descer" na pega da primeira categoria.
    const first = screen.getByLabelText(`Arrastar ${before[0]}`);
    await fireEvent(first, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });

    await screen.findByLabelText(`Arrastar ${before[1]}`);
    const after = handles();
    expect(after.slice(0, 2)).toEqual([before[1], before[0]]);

    // Fora do modo de ordenar, a lista mostra a mesma ordem.
    await fireEvent.press(screen.getByRole('button', { name: 'Concluído' }));
    const rows = await screen.findAllByRole('button', { name: new RegExp(`^${before[1]}`) });
    expect(rows.length).toBeGreaterThan(0);
  });
});
