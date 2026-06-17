import { useEffect } from 'react';

import { isDiagnosticsEnabled, installGlobalDiagnostics } from '@/lib/diagnostics';

export function DiagnosticsBootstrap() {
  useEffect(() => {
    if (isDiagnosticsEnabled()) {
      installGlobalDiagnostics();
    }
  }, []);

  return null;
}
