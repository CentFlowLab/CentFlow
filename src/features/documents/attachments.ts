import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  ATTACHMENT_LIMITS,
  ATTACHMENT_MIMES,
  type AttachmentMime,
  type DocumentAttachment,
  type DocumentRecord,
} from '@/core/finance';
import type { Repositories } from '@/data';
import { getSupabase } from '@/lib/supabase';

/** Balde privado do Storage (migração 20261113000100, ADR-056). */
const BUCKET = 'documents';

const EXTENSIONS: Record<AttachmentMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** Ficheiro escolhido pela pessoa (câmara, galeria ou ficheiros). */
export type PickedFile = {
  uri: string;
  name: string;
  mime: string;
  size: number | null;
  /** Na web, o próprio ficheiro do browser. */
  webFile?: Blob;
};

export type AttachmentErrorCode = 'type' | 'size' | 'limit' | 'offline' | 'failed';

export class AttachmentError extends Error {
  constructor(readonly code: AttachmentErrorCode) {
    super(`attachment_${code}`);
    this.name = 'AttachmentError';
  }
}

export function isImage(attachment: Pick<DocumentAttachment, 'mime'>): boolean {
  return attachment.mime.startsWith('image/');
}

function storagePath(userId: string, documentId: string, attachment: DocumentAttachment): string {
  return `${userId}/${documentId}/${attachment.id}.${EXTENSIONS[attachment.mime]}`;
}

function localFile(attachment: Pick<DocumentAttachment, 'id' | 'mime'>): File {
  const directory = new Directory(Paths.document, 'attachments');
  if (!directory.exists) directory.create();
  return new File(directory, `${attachment.id}.${EXTENSIONS[attachment.mime]}`);
}

async function signedInUserId(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}

async function upload(path: string, body: Blob | Uint8Array, mime: string): Promise<void> {
  const client = getSupabase();
  if (!client) throw new AttachmentError('offline');
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, body, { contentType: mime, upsert: true });
  if (error) throw new AttachmentError('offline');
}

/** Os campos que um documento já tem, para o atualizar só com outra lista de anexos. */
function baseInput(document: DocumentRecord) {
  return {
    title: document.title,
    category: document.category,
    expiresOn: document.expiresOn,
    notes: document.notes,
  };
}

/** Valida o tipo, o tamanho e o limite por documento antes de copiar ou enviar. */
export function checkAttachment(
  document: Pick<DocumentRecord, 'attachments'>,
  picked: PickedFile,
): AttachmentMime {
  if (!(ATTACHMENT_MIMES as readonly string[]).includes(picked.mime)) {
    throw new AttachmentError('type');
  }
  if (picked.size !== null && (picked.size <= 0 || picked.size > ATTACHMENT_LIMITS.maxBytes)) {
    throw new AttachmentError('size');
  }
  if (document.attachments.length >= ATTACHMENT_LIMITS.perDocument) {
    throw new AttachmentError('limit');
  }
  return picked.mime as AttachmentMime;
}

/**
 * Anexa um ficheiro. No telemóvel: copia para a pasta da app, guarda o anexo no documento e envia
 * quando houver rede (fila local). Na web: envia logo (precisa de rede) e só depois guarda.
 */
export async function addAttachment(
  repositories: Repositories,
  document: DocumentRecord,
  picked: PickedFile,
): Promise<DocumentAttachment> {
  const mime = checkAttachment(document, picked);
  const id = Crypto.randomUUID();
  let size = picked.size;
  const name = (picked.name.trim() || `${id}.${EXTENSIONS[mime]}`).slice(
    0,
    ATTACHMENT_LIMITS.nameMaxLength,
  );

  if (Platform.OS === 'web') {
    const userId = await signedInUserId();
    if (!userId) throw new AttachmentError('offline');
    const body = picked.webFile ?? (await (await fetch(picked.uri)).blob());
    size = size ?? body.size;
    const attachment: DocumentAttachment = {
      id,
      name,
      mime,
      size,
      createdAt: new Date().toISOString(),
    };
    checkAttachment(document, { ...picked, size });
    await upload(storagePath(userId, document.id, attachment), body, mime);
    await repositories.documents.update(document.id, {
      ...baseInput(document),
      attachments: [...document.attachments, attachment],
    });
    return attachment;
  }

  const source = new File(picked.uri);
  size = size ?? source.size;
  checkAttachment(document, { ...picked, size });
  const attachment: DocumentAttachment = {
    id,
    name,
    mime,
    size,
    createdAt: new Date().toISOString(),
  };
  const target = localFile(attachment);
  source.copy(target);
  await repositories.attachmentUploads.enqueue({
    attachmentId: id,
    documentId: document.id,
    localUri: target.uri,
    mime,
  });
  await repositories.documents.update(document.id, {
    ...baseInput(document),
    attachments: [...document.attachments, attachment],
  });
  void processUploads(repositories);
  return attachment;
}

let running: Promise<void> | null = null;

/** Envia o que está na fila deste aparelho. Sem rede ou sessão, tenta mais tarde. */
export function processUploads(repositories: Repositories): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  running ??= (async () => {
    try {
      const userId = await signedInUserId();
      if (!userId) return;
      for (const item of await repositories.attachmentUploads.pending()) {
        const file = new File(item.localUri);
        if (!file.exists) {
          await repositories.attachmentUploads.markSent(item.attachmentId);
          continue;
        }
        try {
          const ext = item.localUri.split('.').pop() ?? 'bin';
          await upload(
            `${userId}/${item.documentId}/${item.attachmentId}.${ext}`,
            await file.bytes(),
            item.mime,
          );
          await repositories.attachmentUploads.markSent(item.attachmentId);
        } catch {
          await repositories.attachmentUploads.markFailed(item.attachmentId);
          console.error('[attachments] upload_failed');
          break;
        }
      }
    } finally {
      running = null;
    }
  })();
  return running;
}

/**
 * Endereço para mostrar ou abrir um anexo: a cópia local, se existir (sem rede); senão, um link
 * temporário do Storage. No telemóvel, a imagem descarregada fica em cache para a próxima vez.
 */
export async function attachmentUri(
  document: Pick<DocumentRecord, 'id'>,
  attachment: DocumentAttachment,
): Promise<string | null> {
  if (Platform.OS !== 'web') {
    const cached = localFile(attachment);
    if (cached.exists) return cached.uri;
  }
  const client = getSupabase();
  const userId = await signedInUserId();
  if (!client || !userId) return null;
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(storagePath(userId, document.id, attachment), 300);
  if (error || !data) return null;
  if (Platform.OS !== 'web') {
    try {
      const downloaded = await File.downloadFileAsync(data.signedUrl, localFile(attachment));
      return downloaded.uri;
    } catch {
      return data.signedUrl;
    }
  }
  return data.signedUrl;
}

/** Link temporário (para abrir PDFs no leitor do sistema). */
export async function attachmentLink(
  document: Pick<DocumentRecord, 'id'>,
  attachment: DocumentAttachment,
): Promise<string | null> {
  const client = getSupabase();
  const userId = await signedInUserId();
  if (!client || !userId) return null;
  const { data } = await client.storage
    .from(BUCKET)
    .createSignedUrl(storagePath(userId, document.id, attachment), 300);
  return data?.signedUrl ?? null;
}

async function deleteFiles(documentId: string, attachments: readonly DocumentAttachment[]) {
  const client = getSupabase();
  const userId = await signedInUserId();
  if (Platform.OS !== 'web') {
    for (const attachment of attachments) {
      const file = localFile(attachment);
      if (file.exists) file.delete();
    }
  }
  if (!client || !userId || attachments.length === 0) return;
  const { error } = await client.storage
    .from(BUCKET)
    .remove(attachments.map((attachment) => storagePath(userId, documentId, attachment)));
  if (error) console.error('[attachments] remove_failed');
}

/** Retira um anexo do documento e apaga o ficheiro (no aparelho e no Storage). */
export async function removeAttachment(
  repositories: Repositories,
  document: DocumentRecord,
  attachment: DocumentAttachment,
): Promise<void> {
  await repositories.documents.update(document.id, {
    ...baseInput(document),
    attachments: document.attachments.filter((item) => item.id !== attachment.id),
  });
  await repositories.attachmentUploads.markSent(attachment.id);
  await deleteFiles(document.id, [attachment]);
}

/** Elimina o documento e os ficheiros dele. */
export async function deleteDocumentWithFiles(
  repositories: Repositories,
  document: DocumentRecord,
): Promise<void> {
  await repositories.documents.delete(document.id);
  for (const attachment of document.attachments) {
    await repositories.attachmentUploads.markSent(attachment.id);
  }
  await deleteFiles(document.id, document.attachments);
}
