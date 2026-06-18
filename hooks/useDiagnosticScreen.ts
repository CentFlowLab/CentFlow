import { useEffect } from 'react';

import { setDiagnosticScreen } from '@/lib/diagnostics';

/** Regista o ecrã activo no CentFlow Doctor para contextualizar erros. */
export function useDiagnosticScreen(screen: string): void {
  useEffect(() => {
    setDiagnosticScreen(screen);
    return () => setDiagnosticScreen('unknown');
  }, [screen]);
}
