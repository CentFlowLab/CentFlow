import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { decodeStatementBytes } from '@/core/import';

export type PickedStatement =
  { ok: true; text: string } | { ok: false; reason: 'cancelled' | 'readFailed' };

const CSV_TYPES = [
  'text/csv',
  'text/comma-separated-values',
  'text/plain',
  'application/vnd.ms-excel',
];

/** Abre o seletor de ficheiros e devolve o texto do CSV. O ficheiro nunca sai do dispositivo. */
export async function pickStatementFile(): Promise<PickedStatement> {
  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      // Tipos MIME: o Expo converte-os nos tipos do sistema (UTI no iOS).
      type: CSV_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch {
    return { ok: false, reason: 'readFailed' };
  }
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { ok: false, reason: 'cancelled' };
  try {
    const buffer =
      Platform.OS === 'web' && asset.file
        ? await asset.file.arrayBuffer()
        : await new File(asset.uri).arrayBuffer();
    return { ok: true, text: decodeStatementBytes(new Uint8Array(buffer)) };
  } catch {
    return { ok: false, reason: 'readFailed' };
  }
}
