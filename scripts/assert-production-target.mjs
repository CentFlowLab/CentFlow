import { assertProductionCommand } from './production-target.ts';

try {
  assertProductionCommand(process.argv.slice(2), process.env);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Destino de produção recusado.';
  console.error(message);
  process.exit(1);
}
