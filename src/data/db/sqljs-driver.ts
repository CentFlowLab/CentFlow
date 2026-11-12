import type { Database, SqlJsStatic, SqlValue as SqlJsValue } from 'sql.js';

import type { SqliteDriver, SqlValue } from './sql-database';

/** Onde se guarda o ficheiro da base de dados (IndexedDB na web; memória nos testes). */
export type ByteStore = {
  load(name: string): Promise<Uint8Array | null>;
  save(name: string, bytes: Uint8Array): Promise<void>;
  remove(name: string): Promise<void>;
};

export type SqlJsDriver = SqliteDriver & {
  /** Grava já o que estiver por gravar (ex.: quando o separador vai ser fechado). */
  flush(): Promise<void>;
};

/**
 * Driver SQLite para a web sem isolamento cross-origin (ADR-060): o sql.js corre o SQLite em
 * WebAssembly na própria página, sem SharedArrayBuffer, e o ficheiro inteiro é guardado no
 * `ByteStore` depois de cada escrita confirmada. Funciona em qualquer browser com WebAssembly.
 *
 * `Database.export()` fecha e reabre a ligação: as definições por ligação (`foreign_keys`) são
 * repostas logo a seguir, e nunca se exporta a meio de uma transação.
 */
export async function createSqlJsDriver(
  SQL: SqlJsStatic,
  name: string,
  store: ByteStore,
): Promise<SqlJsDriver> {
  const saved = await store.load(name).catch(() => null);
  const db: Database = new SQL.Database(saved ?? undefined);
  let inTransaction = false;
  let dirty = false;
  let closed = false;
  let saving: Promise<void> = Promise.resolve();
  let scheduled = false;
  let foreignKeys = false;

  const persist = async () => {
    if (!dirty || inTransaction || closed) return;
    dirty = false;
    const bytes = db.export();
    // A exportação reabre a ligação: repor o que é por ligação.
    if (foreignKeys) db.exec('PRAGMA foreign_keys = ON;');
    try {
      await store.save(name, bytes);
    } catch {
      // Sem armazenamento (ex.: modo privado restrito): os dados vivem nesta sessão e no servidor.
    }
  };
  const flush = () => {
    saving = saving.then(persist, persist);
    return saving;
  };
  const schedule = () => {
    dirty = true;
    if (scheduled || inTransaction) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      void flush();
    }, 0);
  };

  const bind = (params: SqlValue[]) => params as SqlJsValue[];
  const isRead = (sql: string) => /^\s*(SELECT|WITH|PRAGMA\s+\w+\s*;?\s*$)/i.test(sql);
  const track = (sql: string) => {
    if (/PRAGMA\s+foreign_keys\s*=\s*ON/i.test(sql)) foreignKeys = true;
    if (!isRead(sql)) schedule();
  };

  const driver: SqlJsDriver = {
    async execAsync(sql) {
      db.exec(sql);
      track(sql);
    },
    async runAsync(sql, params) {
      db.run(sql, bind(params));
      const changes = db.getRowsModified();
      if (changes > 0) schedule();
      return { changes };
    },
    async getAllAsync<T>(sql: string, params: SqlValue[]) {
      const statement = db.prepare(sql);
      try {
        statement.bind(bind(params));
        const rows: T[] = [];
        while (statement.step()) rows.push(statement.getAsObject() as T);
        return rows;
      } finally {
        statement.free();
      }
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[]) {
      const rows = await driver.getAllAsync<T>(sql, params);
      return rows[0] ?? null;
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      inTransaction = true;
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // Já revertida pelo SQLite.
        }
        throw error;
      } finally {
        inTransaction = false;
        if (dirty) schedule();
      }
    },
    async closeAsync() {
      await flush();
      closed = true;
      db.close();
    },
    flush,
  };
  return driver;
}

/** Guarda tudo em memória (testes, ou browsers sem IndexedDB). */
export function createMemoryByteStore(): ByteStore {
  const files = new Map<string, Uint8Array>();
  return {
    async load(name) {
      return files.get(name) ?? null;
    },
    async save(name, bytes) {
      files.set(name, bytes);
    },
    async remove(name) {
      files.delete(name);
    },
  };
}
