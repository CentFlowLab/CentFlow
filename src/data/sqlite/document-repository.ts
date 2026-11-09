import {
  hasErrors,
  validateDocumentInput,
  ValidationError,
  type DocumentInput,
  type DocumentRecord,
} from '@/core/finance';

import { NotFoundError } from '../errors';
import type { DocumentRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type DocumentRow = {
  id: string;
  title: string;
  category: DocumentRecord['category'];
  expires_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, title, category, expires_on, notes, created_at, updated_at`;

function toDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    expiresOn: row.expires_on,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prepare(raw: DocumentInput): DocumentInput {
  const notes = raw.notes?.trim() ?? '';
  const input: DocumentInput = {
    title: raw.title.trim(),
    category: raw.category,
    expiresOn: raw.expiresOn,
    notes: notes === '' ? null : notes,
  };
  const errors = validateDocumentInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

export function createSqliteDocumentRepository(
  context: SqliteRepositoryContext,
): DocumentRepository {
  const { db } = context;

  return {
    async list() {
      const rows = await db.all<DocumentRow>(
        `SELECT ${COLUMNS} FROM documents WHERE deleted_at IS NULL
          ORDER BY expires_on IS NULL, expires_on, title, rowid`,
      );
      return rows.map(toDocument);
    },

    async get(id) {
      const row = await db.first<DocumentRow>(
        `SELECT ${COLUMNS} FROM documents WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row ? toDocument(row) : null;
    },

    create(raw) {
      return write(context, ['documents'], () =>
        db.transaction(async (tx) => {
          const input = prepare(raw);
          const id = context.newId();
          const timestamp = context.now();
          await tx.run(
            `INSERT INTO documents (id, title, category, expires_on, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, input.title, input.category, input.expiresOn, input.notes, timestamp, timestamp],
          );
          return { id, ...input, createdAt: timestamp, updatedAt: timestamp };
        }),
      );
    },

    update(id, raw) {
      return write(context, ['documents'], () =>
        db.transaction(async (tx) => {
          const existing = await tx.first<DocumentRow>(
            `SELECT ${COLUMNS} FROM documents WHERE id = ? AND deleted_at IS NULL`,
            [id],
          );
          if (!existing) throw new NotFoundError('document', id);
          const input = prepare(raw);
          const timestamp = context.now();
          await tx.run(
            `UPDATE documents
                SET title = ?, category = ?, expires_on = ?, notes = ?, updated_at = ?
              WHERE id = ?`,
            [input.title, input.category, input.expiresOn, input.notes, timestamp, id],
          );
          return { ...toDocument(existing), ...input, updatedAt: timestamp };
        }),
      );
    },

    delete(id) {
      return write(context, ['documents'], async () => {
        const timestamp = context.now();
        const { changes } = await db.run(
          `UPDATE documents SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
          [timestamp, timestamp, id],
        );
        if (changes === 0) throw new NotFoundError('document', id);
      });
    },
  };
}
