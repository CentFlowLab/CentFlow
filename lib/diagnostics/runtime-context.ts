let currentScreen = 'bootstrap';
let lastAction = 'idle';

export function setDiagnosticScreen(screen: string): void {
  currentScreen = screen;
}

export function setDiagnosticAction(action: string): void {
  lastAction = action;
}

export function getDiagnosticRuntimeContext(): { screen: string; action: string } {
  return { screen: currentScreen, action: lastAction };
}

export function withDiagnosticContext(
  context?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...getDiagnosticRuntimeContext(),
    ...context,
  };
}
