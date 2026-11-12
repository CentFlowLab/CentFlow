import {
  buildBackup,
  planRestore,
  toCsv,
  type BackupFile,
  type BackupRow,
  type LocalRowState,
  type RestorePlan,
} from '@/core/backup';

import type { SqlExecutor } from '../db/sql-database';
import type { BackupRepository, DataEntity } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';
import { SYNC_COLUMNS, SYNC_ENTITIES } from './sync-store';

async function localStates(tx: SqlExecutor) {
  const maps = new Map<string, Map<string, LocalRowState>>();
  for (const table of SYNC_ENTITIES) {
    const rows = await tx.all<{ id: string; updated_at: string; deleted_at: string | null }>(
      `SELECT id, updated_at, deleted_at FROM ${table}`,
    );
    maps.set(table, new Map(rows.map((row) => [row.id, row])));
  }
  return (table: string) => maps.get(table) ?? new Map<string, LocalRowState>();
}

/** Só tabelas e colunas conhecidas: um ficheiro adulterado não escolhe o SQL. */
function knownRows(backup: Pick<BackupFile, 'tables'>): Pick<BackupFile, 'tables'> {
  const tables: Record<string, BackupRow[]> = {};
  for (const table of SYNC_ENTITIES) {
    const rows = backup.tables[table];
    if (Array.isArray(rows)) tables[table] = rows.filter((row) => typeof row?.id === 'string');
  }
  return { tables };
}

export function createSqliteBackupRepository(context: SqliteRepositoryContext): BackupRepository {
  const { db } = context;

  return {
    async exportData(appVersion) {
      const version = await db.first<{ user_version: number }>('PRAGMA user_version');
      const tables: Record<string, BackupRow[]> = {};
      for (const table of SYNC_ENTITIES) {
        tables[table] = await db.all<BackupRow>(
          `SELECT ${SYNC_COLUMNS[table].join(', ')} FROM ${table}
            WHERE deleted_at IS NULL ORDER BY created_at, id`,
        );
      }
      const attachments: BackupFile['attachments'] = [];
      for (const document of tables.documents ?? []) {
        try {
          const list = JSON.parse(String(document.attachments ?? '[]')) as {
            name?: string;
            size?: number;
          }[];
          for (const item of list) {
            attachments.push({
              documentId: document.id,
              name: String(item.name ?? ''),
              size: Number(item.size ?? 0),
            });
          }
        } catch {
          // Lista inválida: o documento continua na cópia, sem a lista de anexos.
        }
      }
      return buildBackup({
        createdAt: context.now(),
        schemaVersion: version?.user_version ?? 0,
        appVersion,
        tables,
        attachments,
      });
    },

    async entriesCsv() {
      const rows = await db.all<{
        date: string;
        type: string;
        amount: number;
        currency: string;
        description: string;
        category: string | null;
        account: string;
        destination: string | null;
        notes: string | null;
      }>(
        `SELECT e.date, e.type, e.amount, a.currency, e.description, c.name AS category,
                a.name AS account, d.name AS destination, e.notes
           FROM entries e
           JOIN accounts a ON a.id = e.account_id
           LEFT JOIN categories c ON c.id = e.category_id
           LEFT JOIN accounts d ON d.id = e.destination_account_id
          WHERE e.deleted_at IS NULL
          ORDER BY e.date, e.created_at`,
      );
      // Valores em unidades principais com ponto decimal (2 casas; moedas sem cêntimos: 0).
      const major = (minor: number, currency: string) => {
        const digits = ['JPY', 'KRW', 'CLP', 'ISK', 'HUF'].includes(currency) ? 0 : 2;
        return (minor / 10 ** digits).toFixed(digits);
      };
      return toCsv(
        [
          'date',
          'type',
          'amount',
          'currency',
          'description',
          'category',
          'account',
          'destination',
          'notes',
        ],
        rows.map((row) => [
          row.date,
          row.type,
          major(row.amount, row.currency),
          row.currency,
          row.description,
          row.category,
          row.account,
          row.destination,
          row.notes,
        ]),
      );
    },

    async planRestore(backup) {
      return planRestore(knownRows(backup), await localStates(db));
    },

    applyRestore(backup) {
      return write(context, [...SYNC_ENTITIES] as DataEntity[], () =>
        db.transaction(async (tx): Promise<RestorePlan> => {
          // O plano é refeito dentro da transação: nada mais recente pode ter entrado entretanto.
          const plan = planRestore(knownRows(backup), await localStates(tx));
          await tx.exec('PRAGMA defer_foreign_keys = ON;');
          for (const table of SYNC_ENTITIES) {
            const allowed = SYNC_COLUMNS[table];
            for (const row of plan.insert[table] ?? []) {
              const columns = allowed.filter((column) => column in row);
              await tx.run(
                `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
                columns.map((column) => row[column] ?? null),
              );
            }
            for (const row of plan.update[table] ?? []) {
              const columns = allowed.filter(
                (column) => column in row && column !== 'id' && column !== 'created_at',
              );
              await tx.run(
                `UPDATE ${table} SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`,
                [...columns.map((column) => row[column] ?? null), row.id],
              );
            }
          }
          return plan;
        }),
      );
    },
  };
}
