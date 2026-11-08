import { screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import type { BudgetLevel } from '@/core/finance';
import { renderWithProviders } from '@/test-utils/render';
import { colorsByScheme, type ColorScheme } from '@/ui/theme';

import { BudgetMeter } from '../BudgetMeter';

function fillColor(node: ReactTestRendererJSON | ReactTestRendererJSON[] | null): string | null {
  if (!node || Array.isArray(node)) return null;
  const style = node.props.style as { backgroundColor?: string; width?: string } | undefined;
  if (style?.width?.endsWith('%') && style.backgroundColor) return style.backgroundColor;
  for (const child of node.children ?? []) {
    if (typeof child === 'string') continue;
    const found = fillColor(child);
    if (found) return found;
  }
  return null;
}

function Meters({ level, ratio, label }: { level: BudgetLevel; ratio: number; label: string }) {
  return <BudgetMeter level={level} ratio={ratio} accessibilityLabel={label} />;
}

describe('budget meter colors', () => {
  it.each([
    ['light', 'ok', 0.4, 'positive'],
    ['dark', 'ok', 0.4, 'positive'],
    ['light', 'watch', 0.75, 'warning'],
    ['dark', 'near', 0.9, 'warning'],
    ['light', 'over', 1.2, 'negative'],
    ['dark', 'over', 1.4, 'negative'],
  ] as const)('uses %s %s color', async (scheme: ColorScheme, level, ratio, token) => {
    await renderWithProviders(<Meters level={level} ratio={ratio} label={level} />, {
      preferences: { theme: scheme },
    });
    const tree = screen.toJSON();
    const color = colorsByScheme[scheme][token];
    expect(fillColor(tree)).toBe(color);
  });
});
