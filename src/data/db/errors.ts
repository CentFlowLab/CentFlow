import { SchemaTooNewError } from './migrations';

export type DatabaseUnavailableReason =
  /** Web sem cabeçalhos COOP/COEP: SharedArrayBuffer indisponível. */
  | 'notIsolated'
  /** Web: a base de dados OPFS já está aberta noutro separador. */
  | 'otherTab'
  /** Base de dados criada por uma versão mais recente da app. */
  | 'schemaTooNew'
  | 'unknown';

export class DatabaseUnavailableError extends Error {
  constructor(
    readonly reason: DatabaseUnavailableReason,
    options?: { cause?: unknown },
  ) {
    super(`Database unavailable: ${reason}`, options);
    this.name = 'DatabaseUnavailableError';
  }
}

export function toDatabaseUnavailableError(error: unknown): DatabaseUnavailableError {
  if (error instanceof DatabaseUnavailableError) return error;
  if (error instanceof SchemaTooNewError)
    return new DatabaseUnavailableError('schemaTooNew', { cause: error });
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/NoModificationAllowed|Access Handle|createSyncAccessHandle/i.test(message)) {
    return new DatabaseUnavailableError('otherTab', { cause: error });
  }
  return new DatabaseUnavailableError('unknown', { cause: error });
}
