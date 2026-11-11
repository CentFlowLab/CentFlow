import {
  hasErrors,
  isValidAttachment,
  validateDocumentInput,
  ValidationError,
  type DocumentAttachment,
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
  vehicle_id: string | null;
  attachments: string | null;
  acquired_on: string | null;
  amount: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, title, category, expires_on, notes, vehicle_id, attachments, acquired_on, amount,
  currency, created_at, updated_at`;

/** Lê os anexos guardados; um valor estragado conta como vazio em vez de partir a lista. */
function parseAttachments(text: string | null): DocumentAttachment[] {
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      const item = value as Record<string, unknown>;
      const attachment = {
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        mime: item.mime as DocumentAttachment['mime'],
        size: Number(item.size),
        createdAt: String(item.created_at ?? ''),
      };
      return isValidAttachment(attachment) ? [attachment] : [];
    });
  } catch {
    return [];
  }
}

function serializeAttachments(attachments: readonly DocumentAttachment[]): string | null {
  if (attachments.length === 0) return null;
  return JSON.stringify(
    attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mime: attachment.mime,
      size: attachment.size,
      created_at: attachment.createdAt,
    })),
  );
}

function toDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    expiresOn: row.expires_on,
    notes: row.notes,
    vehicleId: row.vehicle_id,
    attachments: parseAttachments(row.attachments),
    acquiredOn: row.acquired_on,
    amount: row.amount,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type StoredDocument = Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'>;

/** Campos ausentes no `raw` (ecrãs antigos) mantêm o valor de `existing`. */
function prepare(raw: DocumentInput, existing?: StoredDocument): StoredDocument {
  const notes = raw.notes?.trim() ?? '';
  const keep = <K extends keyof StoredDocument>(key: K, fallback: StoredDocument[K]) =>
    (raw as Partial<StoredDocument>)[key] === undefined
      ? (existing?.[key] ?? fallback)
      : ((raw as Partial<StoredDocument>)[key] as StoredDocument[K]);
  const input: StoredDocument = {
    title: raw.title.trim(),
    category: raw.category,
    expiresOn: raw.expiresOn,
    notes: notes === '' ? null : notes,
    vehicleId: keep('vehicleId', null),
    attachments: keep('attachments', []),
    acquiredOn: keep('acquiredOn', null),
    amount: keep('amount', null),
    currency: keep('currency', null)?.toUpperCase() ?? null,
  };
  const errors = validateDocumentInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

const values = (input: StoredDocument) => [
  input.title,
  input.category,
  input.expiresOn,
  input.notes,
  input.vehicleId,
  serializeAttachments(input.attachments),
  input.acquiredOn,
  input.amount,
  input.currency,
];

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
            `INSERT INTO documents (id, title, category, expires_on, notes, vehicle_id, attachments,
               acquired_on, amount, currency, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, ...values(input), timestamp, timestamp],
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
          const before = toDocument(existing);
          const input = prepare(raw, before);
          const timestamp = context.now();
          await tx.run(
            `UPDATE documents
                SET title = ?, category = ?, expires_on = ?, notes = ?, vehicle_id = ?,
                    attachments = ?, acquired_on = ?, amount = ?, currency = ?, updated_at = ?
              WHERE id = ?`,
            [...values(input), timestamp, id],
          );
          return { ...before, ...input, updatedAt: timestamp };
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
