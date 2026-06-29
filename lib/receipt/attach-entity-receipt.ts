import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';

import { isMockAuthEnabled } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase/client';
import { updateEntityReceiptUrl } from '@/lib/supabase/accounts';

export type AttachReceiptEntityType = 'transaction' | 'warranty' | 'inventory';

const TABLE_BY_ENTITY: Record<
  AttachReceiptEntityType,
  'transactions' | 'warranties' | 'inventory_items'
> = {
  transaction: 'transactions',
  warranty: 'warranties',
  inventory: 'inventory_items',
};

type PickResult = { uri: string; mimeType: string; fileName: string } | null;

async function pickFromCamera(): Promise<PickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    fileName: asset.fileName ?? `receipt-${Date.now()}.jpg`,
  };
}

async function pickFromGallery(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    fileName: asset.fileName ?? `receipt-${Date.now()}.jpg`,
  };
}

async function pickPdf(): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'application/pdf',
    fileName: asset.name ?? `receipt-${Date.now()}.pdf`,
  };
}

async function readFileBytes(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

async function uploadReceiptFile(
  userId: string,
  entityType: AttachReceiptEntityType,
  entityId: string,
  file: NonNullable<PickResult>,
): Promise<string> {
  const supabase = getSupabaseClient();
  const safeName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${entityType}/${entityId}/${Date.now()}-${safeName}`;
  const bytes = await readFileBytes(file.uri);

  const { error } = await supabase.storage.from('receipts').upload(path, bytes, {
    contentType: file.mimeType,
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('receipts').getPublicUrl(path);
  return data.publicUrl;
}

export function showAttachReceiptPicker(
  onPick: (source: 'camera' | 'gallery' | 'pdf') => void,
): void {
  if (Platform.OS === 'web') {
    onPick('gallery');
    return;
  }

  Alert.alert('Anexar fatura', 'Como queres adicionar o documento?', [
    { text: 'Tirar foto', onPress: () => onPick('camera') },
    { text: 'Escolher da galeria', onPress: () => onPick('gallery') },
    { text: 'Importar PDF', onPress: () => onPick('pdf') },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}

export async function attachReceiptToEntity(
  entityType: AttachReceiptEntityType,
  entityId: string,
  source: 'camera' | 'gallery' | 'pdf',
): Promise<string> {
  const picked =
    source === 'camera'
      ? await pickFromCamera()
      : source === 'pdf'
        ? await pickPdf()
        : await pickFromGallery();

  if (!picked) throw new Error('Seleção cancelada');

  if (isMockAuthEnabled()) {
    return picked.uri;
  }

  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilizador não autenticado');

  const url = await uploadReceiptFile(user.id, entityType, entityId, picked);
  await updateEntityReceiptUrl(TABLE_BY_ENTITY[entityType], entityId, url);
  return url;
}

export async function openReceiptUrl(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url);
}
