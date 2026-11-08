import { assertStagingCommand } from './staging-target.ts';

try {
  assertStagingCommand(process.argv.slice(2), process.env);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Destino de staging recusado.';
  console.error(message);
  process.exit(1);
}
