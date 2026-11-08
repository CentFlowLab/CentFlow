export type SqlValue = string | number | null;

/**
 * Subconjunto da API de `SQLiteDatabase` do expo-sqlite (v58) usado pela app.
 * O objeto devolvido por `openDatabaseAsync` satisfaz esta interface tal como está;
 * os testes usam uma implementação equivalente sobre `node:sqlite`.
 */
export interface SqliteDriver {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<{ changes: number }>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
}

export interface SqlExecutor {
  /** Várias instruções, sem parâmetros (DDL). */
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
}

export interface SqlDatabase extends SqlExecutor {
  /**
   * Executa `task` numa transação (commit no fim, rollback em erro).
   * Dentro da tarefa use apenas `tx`: chamar a própria base de dados aguardaria
   * pelo fim da transação e bloquearia.
   */
  transaction<T>(task: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export type DatabaseErrorKind = 'constraint' | 'foreignKey' | 'busy' | 'unknown';

export class DatabaseError extends Error {
  constructor(
    readonly kind: DatabaseErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'DatabaseError';
  }
}

function classify(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const message = error instanceof Error ? error.message : String(error);
  let kind: DatabaseErrorKind = 'unknown';
  if (/FOREIGN KEY constraint failed/i.test(message)) kind = 'foreignKey';
  else if (/constraint failed/i.test(message)) kind = 'constraint';
  else if (/database is locked|SQLITE_BUSY/i.test(message)) kind = 'busy';
  return new DatabaseError(kind, message, { cause: error });
}

/**
 * Envolve um driver numa base de dados com acesso serializado: cada operação
 * (ou transação inteira) corre isoladamente, pela ordem em que foi pedida.
 * Necessário porque o expo-sqlite usa uma única ligação e consultas feitas durante
 * uma transação juntar-se-iam a ela.
 */
export function createSqlDatabase(driver: SqliteDriver): SqlDatabase {
  let tail: Promise<unknown> = Promise.resolve();
  let closed = false;

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    if (closed) return Promise.reject(new DatabaseError('unknown', 'Database is closed'));
    const result = tail.then(operation, operation);
    tail = result.catch(() => undefined);
    return result;
  }

  const fromDriver = <T>(call: () => Promise<T>): Promise<T> =>
    call().catch((error: unknown) => {
      throw classify(error);
    });

  const raw: SqlExecutor = {
    exec: (sql) => fromDriver(() => driver.execAsync(sql)),
    run: (sql, params = []) =>
      fromDriver(async () => {
        const { changes } = await driver.runAsync(sql, params);
        return { changes };
      }),
    all: (sql, params = []) => fromDriver(() => driver.getAllAsync(sql, params)),
    first: (sql, params = []) => fromDriver(() => driver.getFirstAsync(sql, params)),
  };

  return {
    exec: (sql) => enqueue(() => raw.exec(sql)),
    run: (sql, params) => enqueue(() => raw.run(sql, params)),
    all: <T>(sql: string, params?: SqlValue[]) => enqueue(() => raw.all<T>(sql, params)),
    first: <T>(sql: string, params?: SqlValue[]) => enqueue(() => raw.first<T>(sql, params)),
    transaction: <T>(task: (tx: SqlExecutor) => Promise<T>) =>
      enqueue(async () => {
        let value: T | undefined;
        await driver.withTransactionAsync(async () => {
          value = await task(raw);
        });
        return value as T;
      }),
    close: () =>
      enqueue(async () => {
        closed = true;
        await driver.closeAsync();
      }),
  };
}
