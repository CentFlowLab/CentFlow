import { useCallback, useEffect, useState } from 'react';

import type { SimulationScenario } from '@/lib/domain/financial/simulator.types';
import type { SimulationScenarioType } from '@/lib/domain/financial/simulator.types';
import {
  subscribeDecisionSimulator,
  type SimulatorOpenRequest,
} from '@/lib/simulator/simulator-bridge';

import { DecisionSimulatorModal } from './DecisionSimulatorModal';

/** Host global — modal acessível a partir de Home, Análises e sugestões. */
export function DecisionSimulatorHost() {
  const [visible, setVisible] = useState(false);
  const [presetType, setPresetType] = useState<SimulationScenarioType | undefined>();
  const [initialScenario, setInitialScenario] = useState<SimulationScenario | undefined>();

  const open = useCallback((request: SimulatorOpenRequest) => {
    setPresetType(request.presetType ?? request.scenario?.type);
    setInitialScenario(request.scenario);
    setVisible(true);
  }, []);

  useEffect(() => subscribeDecisionSimulator(open), [open]);

  return (
    <DecisionSimulatorModal
      visible={visible}
      onClose={() => setVisible(false)}
      presetType={presetType}
      initialScenario={initialScenario}
    />
  );
}
