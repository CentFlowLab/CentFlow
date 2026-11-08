import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { initializeDatabase } from '@/data/db/initialize';
import type { SqlDatabase, SqliteDriver } from '@/data/db/sql-database';
import type { Repositories } from '@/data/repositories/types';
import { createSqliteRepositories } from '@/data/sqlite';

/**
 * Driver de testes com SQLite real (módulo `node:sqlite` do Node), com a mesma semântica
 * de transação que o `withTransactionAsync` do expo-sqlite.
 */
export function createNodeSqliteDriver(path = ':memory:'): SqliteDriver {
  const db = new DatabaseSync(path);
  const driver: SqliteDriver = {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params) {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    async getAllAsync<T>(sql: string, params: (string | number | null)[]) {
      return db
        .prepare(sql)
        .all(...params)
        .map((row) => ({ ...row }) as T);
    },
    async getFirstAsync<T>(sql: string, params: (string | number | null)[]) {
      const row = db.prepare(sql).get(...params);
      return row ? ({ ...row } as T) : null;
    },
    async withTransactionAsync(task) {
      try {
        await driver.execAsync('BEGIN');
        await task();
        await driver.execAsync('COMMIT');
      } catch (error) {
        try {
          await driver.execAsync('ROLLBACK');
        } catch {
          // Já revertida pelo SQLite.
        }
        throw error;
      }
    },
    async closeAsync() {
      db.close();
    },
  };
  return driver;
}

export function createTempDirectory(): {
  path: string;
  file: (name: string) => string;
  remove: () => void;
} {
  const path = mkdtempSync(join(tmpdir(), 'centflow-test-'));
  return {
    path,
    file: (name) => join(path, name),
    remove: () => rmSync(path, { recursive: true, force: true }),
  };
}

let idCounter = 0;

/** IDs determinísticos em formato UUID para testes. */
export function testId(): string {
  idCounter += 1;
  return `00000000-0000-4000-8000-${String(idCounter).padStart(12, '0')}`;
}

export async function openTestDatabase(path = ':memory:'): Promise<SqlDatabase> {
  return initializeDatabase(createNodeSqliteDriver(path), {
    useWriteAheadLog: path !== ':memory:',
  });
}

export async function openTestRepositories(
  path = ':memory:',
  options: { now?: () => Date } = {},
): Promise<{ db: SqlDatabase; repos: Repositories }> {
  const db = await openTestDatabase(path);
  return { db, repos: createSqliteRepositories(db, { newId: testId, ...options }) };
}
