import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  FloatingTabBarInsetProvider,
  floatingTabBarBottom,
  useFloatingTabBarInset,
} from '../layout/floatingTabBar';

let mockBreakpoint: 'compact' | 'medium' | 'expanded' = 'compact';
jest.mock('../layout/useBreakpoint', () => ({ useBreakpoint: () => mockBreakpoint }));

describe('floating tab bar spacing', () => {
  it('sits above the home indicator, with a minimum when there is none', () => {
    expect(floatingTabBarBottom(0)).toBe(12);
    expect(floatingTabBarBottom(34)).toBe(42);
  });

  it('reserves room for the island only inside the tabs on a phone', async () => {
    const metrics = {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    };
    const safe = ({ children }: { children: ReactNode }) => (
      <SafeAreaProvider initialMetrics={metrics}>{children}</SafeAreaProvider>
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SafeAreaProvider initialMetrics={metrics}>
        <FloatingTabBarInsetProvider>{children}</FloatingTabBarInsetProvider>
      </SafeAreaProvider>
    );
    mockBreakpoint = 'compact';
    const inside = await renderHook(() => useFloatingTabBarInset(), { wrapper });
    expect(inside.result.current).toBe(64 + 42 + 16);
    const outside = await renderHook(() => useFloatingTabBarInset(), { wrapper: safe });
    expect(outside.result.current).toBe(0);
    mockBreakpoint = 'expanded';
    const desktop = await renderHook(() => useFloatingTabBarInset(), { wrapper });
    expect(desktop.result.current).toBe(0);
  });
});
