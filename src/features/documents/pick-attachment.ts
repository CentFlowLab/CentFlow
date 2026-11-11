import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import type { PickedFile } from './attachments';

export type PickSource = 'camera' | 'library' | 'files';

/** `null`: a pessoa cancelou. `'denied'`: sem permissão da câmara. */
export async function pickAttachment(source: PickSource): Promise<PickedFile | null | 'denied'> {
  if (source === 'files') {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return null;
    return {
      uri: asset.uri,
      name: asset.name,
      mime: asset.mimeType ?? '',
      size: asset.size ?? null,
      webFile: asset.file,
    };
  }

  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return 'denied';
  }
  // Qualidade abaixo de 1: o iPhone converte HEIC em JPEG e o ficheiro fica mais leve.
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  const mime = asset.mimeType ?? 'image/jpeg';
  return {
    uri: asset.uri,
    name: asset.fileName ?? `foto.${mime === 'image/png' ? 'png' : 'jpg'}`,
    mime,
    size: asset.fileSize ?? null,
    webFile: asset.file,
  };
}
