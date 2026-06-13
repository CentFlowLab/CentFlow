import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export async function pickCsvFile(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'application/vnd.ms-excel',
      'text/plain',
      '*/*',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const name = asset.name ?? 'import.csv';
  let text: string;

  if (Platform.OS === 'web') {
    if ('file' in asset && asset.file instanceof File) {
      text = await asset.file.text();
    } else {
      const response = await fetch(asset.uri);
      if (!response.ok) {
        throw new Error('Não foi possível ler o ficheiro CSV.');
      }
      text = await response.text();
    }
  } else {
    text = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  if (!text.trim()) {
    throw new Error('O ficheiro CSV está vazio.');
  }

  return { name, text };
}
