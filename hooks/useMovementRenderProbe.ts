import { useEffect, useRef } from 'react';

import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';

/**
 * Regista abertura do modal de movimentos no Doctor (sem hooks por render).
 */
export function useMovementRenderProbe(enabled: boolean, component = 'AddTransactionModal') {
  const mountId = useRef(`mount-${Date.now()}`);

  useEffect(() => {
    if (!enabled) return;

    mountId.current = `mount-${Date.now()}`;
    traceMovementStep('form_open', { component, mountId: mountId.current, source: 'render_probe' });
  }, [enabled, component]);
}
