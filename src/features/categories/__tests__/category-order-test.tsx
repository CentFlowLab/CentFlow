import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

jest.setTimeout(60_000);

beforeEach(() => AsyncStorage.setItem('centflow:onboarding:seen', '1'));

const rows = () =>
  screen
    .getAllByRole('adjustable')
    .map((node) => String(node.props.accessibilityLabel).replace('Arrastar ', ''));

const actionNames = (name: string) =>
  (screen.getByLabelText(`Arrastar ${name}`).props.accessibilityActions as { name: string }[]).map(
    (action) => action.name,
  );

describe('category order (drag and drop)', () => {
  it('reorders from the row with screen reader actions, without arrow buttons', async () => {
    await renderRouter('./src/app', { initialUrl: '/categories' });
    await fireEvent.press(await screen.findByRole('button', { name: 'Ordenar' }));
    const before = rows();
    expect(before.length).toBeGreaterThan(2);
    // As setas visíveis saíram: subir/descer existe só como ação da linha.
    expect(screen.queryByRole('button', { name: `Subir ${before[1]}` })).toBeNull();

    // A primeira não sobe e a última não desce.
    expect(actionNames(before[0]!)).not.toContain('moveUp');
    expect(actionNames(before[0]!)).toContain('moveDown');
    expect(actionNames(before.at(-1)!)).not.toContain('moveDown');

    // "Descer" (increment) na primeira linha.
    const first = screen.getByLabelText(`Arrastar ${before[0]}`);
    await fireEvent(first, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await screen.findByLabelText(`Arrastar ${before[1]}`);
    expect(rows().slice(0, 2)).toEqual([before[1], before[0]]);

    // Ação com nome "Subir" na segunda linha volta a pôr como estava.
    const second = screen.getByLabelText(`Arrastar ${before[0]}`);
    await fireEvent(second, 'accessibilityAction', { nativeEvent: { actionName: 'moveUp' } });
    await screen.findByLabelText(`Arrastar ${before[0]}`);
    expect(rows().slice(0, 2)).toEqual([before[0], before[1]]);

    // Fora do modo de ordenar, a lista mostra a mesma ordem.
    await fireEvent.press(screen.getByRole('button', { name: 'Concluído' }));
    const listed = await screen.findAllByRole('button', { name: new RegExp(`^${before[0]}`) });
    expect(listed.length).toBeGreaterThan(0);
  });
});
