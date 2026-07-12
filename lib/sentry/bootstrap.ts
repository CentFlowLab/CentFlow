/** Inicialização segura — sem crash se o módulo nativo ainda não estiver no build. */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initSentry } = require('./init') as typeof import('./init');
  initSentry();
} catch (error) {
  if (__DEV__) {
    console.info('[Sentry] Módulo nativo indisponível — telemetria desactivada.', error);
  }
}
