import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { ReceiptDraft } from '@/lib/domain/receipt.types';
import { getReceiptOcrUri } from '@/lib/receipt/receipt-image-preprocess';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Lê o ficheiro do talão para upload — evita `response.blob()` no React Native,
 * que lança "Creating blobs from ArrayBuffer/ArrayBufferView are not supported".
 */
export async function readDraftFileBytes(draft: ReceiptDraft): Promise<ArrayBuffer> {
  const uri = getReceiptOcrUri(draft);

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Não foi possível ler o ficheiro do talão');
    }
    return response.arrayBuffer();
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error('O ficheiro do talão não foi encontrado. Tenta seleccionar a imagem novamente.');
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return base64ToArrayBuffer(base64);
}

export type NativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

/** Objeto `{ uri, name, type }` aceite pelo FormData do React Native. */
export function toNativeFormDataFile(draft: ReceiptDraft): NativeUploadFile {
  const uri = getReceiptOcrUri(draft);
  return {
    uri,
    name: draft.fileName,
    type: draft.mimeType,
  };
}
