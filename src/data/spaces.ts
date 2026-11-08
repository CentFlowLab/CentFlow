/**
 * Espaços locais: cada conta tem a sua própria base de dados no dispositivo e o uso sem conta
 * tem outra. Nunca se misturam automaticamente; importar dados sem conta é uma decisão explícita.
 */
export type LocalSpace = { kind: 'anonymous' } | { kind: 'user'; userId: string };

export const ANONYMOUS_SPACE: LocalSpace = { kind: 'anonymous' };

/** A base de dados da Fase 1 continua a ser a do uso sem conta. */
export const ANONYMOUS_DATABASE_NAME = 'centflow.db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function databaseNameFor(space: LocalSpace): string {
  if (space.kind === 'anonymous') return ANONYMOUS_DATABASE_NAME;
  if (!UUID.test(space.userId)) throw new Error('Invalid user id for a local space');
  return `centflow-u-${space.userId.toLowerCase()}.db`;
}

export function sameSpace(a: LocalSpace, b: LocalSpace): boolean {
  return databaseNameFor(a) === databaseNameFor(b);
}
