import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export async function pickCsvFile(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'application/vnd.ms-excel',
      'text/plain',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const uri = asset.uri;
  const name = asset.name ?? 'import.csv';

  let text: string;

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Não foi possível ler o ficheiro CSV.');
    }
    text = await response.text();
  } else {
    text = await FileSystem.readAsStringAsync(uri, {
      encoding: 'utf8',
    });
  }

  return { name, text };
}
