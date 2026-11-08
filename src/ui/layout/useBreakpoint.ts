import { useWindowDimensions } from 'react-native';

import { breakpoints } from '../theme/tokens';

/** compact: telemóvel · medium: tablet / janela estreita · expanded: desktop */
export type Breakpoint = 'compact' | 'medium' | 'expanded';

export function getBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints.expanded) return 'expanded';
  if (width >= breakpoints.medium) return 'medium';
  return 'compact';
}

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return getBreakpoint(width);
}
