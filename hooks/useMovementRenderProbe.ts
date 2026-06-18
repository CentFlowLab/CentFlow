import { useEffect, useRef } from 'react';

import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';

const RENDER_WARN_THRESHOLD = 40;
const RENDER_BURST_DELTA = 8;

/**
 * Deteta possíveis render loops no modal de movimentos.
 * Regista no Doctor quando o contador dispara sem lançar excepção.
 */
export function useMovementRenderProbe(enabled: boolean, component = 'AddTransactionModal') {
  const renderCount = useRef(0);
  const lastLoggedAt = useRef(0);
  const mountId = useRef(`mount-${Date.now()}`);

  renderCount.current += 1;

  useEffect(() => {
    if (!enabled) return;

    const count = renderCount.current;
    const sinceLastLog = count - lastLoggedAt.current;

    if (count <= 3 || count % 10 === 0) {
      traceMovementStep('render_tick', {
        component,
        mountId: mountId.current,
        renderCount: count,
      });
    }

    if (count >= RENDER_WARN_THRESHOLD && sinceLastLog >= RENDER_BURST_DELTA) {
      traceMovementStep('render_loop_suspect', {
        component,
        mountId: mountId.current,
        renderCount: count,
        severity: 'high',
      });
      lastLoggedAt.current = count;
    }
  });

  useEffect(() => {
    if (!enabled) return;
    mountId.current = `mount-${Date.now()}`;
    renderCount.current = 0;
    lastLoggedAt.current = 0;
    traceMovementStep('form_open', { component, mountId: mountId.current });
  }, [enabled, component]);
}
