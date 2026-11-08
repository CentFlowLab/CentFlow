import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { useBreakpoint } from '@/ui/layout/useBreakpoint';

import type { TabRouteName } from '../nav-items';
import { MobileTabBar } from './MobileTabBar';
import { Sidebar } from './Sidebar';

/** Barra inferior em telemóvel; sidebar compacta em tablet; sidebar completa em desktop. */
export function AppTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const breakpoint = useBreakpoint();
  const focused = state.routes[state.index];

  const select = (routeName: TabRouteName) => {
    const target = state.routes.find((route) => route.name === routeName);
    if (!target) return;
    const event = emitter.emit({ type: 'tabPress', target: target.key, canPreventDefault: true });
    if (target.key !== focused?.key && !event.defaultPrevented) {
      navigateToTab(target.key);
    }
  };

  if (breakpoint === 'compact') {
    return <MobileTabBar activeRoute={focused?.name} onSelect={select} />;
  }
  return (
    <Sidebar activeRoute={focused?.name} collapsed={breakpoint === 'medium'} onSelect={select} />
  );
}
