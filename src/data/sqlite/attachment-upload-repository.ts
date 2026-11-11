import type { AttachmentUpload, AttachmentUploadRepository } from '../repositories/types';
import type { SqliteRepositoryContext } from './context';

type UploadRow = {
  attachment_id: string;
  document_id: string;
  local_uri: string;
  mime: string;
  created_at: string;
  attempts: number;
};

function toUpload(row: UploadRow): AttachmentUpload {
  return {
    attachmentId: row.attachment_id,
    documentId: row.document_id,
    localUri: row.local_uri,
    mime: row.mime,
    createdAt: row.created_at,
    attempts: row.attempts,
  };
}

/**
 * Fila dos ficheiros por enviar para o Storage (ADR-056). Só neste aparelho: não entra na
 * sincronização (os metadados do anexo, sim, vão no documento).
 */
export function createSqliteAttachmentUploadRepository(
  context: SqliteRepositoryContext,
): AttachmentUploadRepository {
  const { db } = context;
  return {
    async enqueue(upload) {
      await db.run(
        `INSERT OR REPLACE INTO attachment_uploads
           (attachment_id, document_id, local_uri, mime, created_at, attempts)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [upload.attachmentId, upload.documentId, upload.localUri, upload.mime, context.now()],
      );
    },
    async pending() {
      const rows = await db.all<UploadRow>(
        'SELECT * FROM attachment_uploads ORDER BY created_at, attachment_id',
      );
      return rows.map(toUpload);
    },
    async markSent(attachmentId) {
      await db.run('DELETE FROM attachment_uploads WHERE attachment_id = ?', [attachmentId]);
    },
    async markFailed(attachmentId) {
      await db.run(
        'UPDATE attachment_uploads SET attempts = attempts + 1 WHERE attachment_id = ?',
        [attachmentId],
      );
    },
  };
}
