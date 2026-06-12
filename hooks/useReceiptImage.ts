import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';

import type { ReceiptDraft } from '@/lib/domain/receipt.types';
import { preprocessReceiptImage } from '@/lib/receipt/receipt-image-preprocess';

async function buildDraftFromAsset(
  asset: ImagePicker.ImagePickerAsset,
): Promise<ReceiptDraft> {
  const fileName = asset.fileName ?? `receipt-${Date.now()}.jpg`;

  // Pré-processamento OCR: resize + JPEG 92% (ver receipt-image-preprocess.ts)
  return preprocessReceiptImage(asset.uri, {
    originalWidth: asset.width,
    originalHeight: asset.height,
    fileName,
    exif: asset.exif ?? undefined,
  });
}

async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permissão necessária',
      'Precisamos de acesso à câmara para digitalizar talões.',
    );
    return false;
  }
  return true;
}

async function ensureGalleryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permissão necessária',
      'Precisamos de acesso à galeria para escolher fotos de talões.',
    );
    return false;
  }
  return true;
}

export function useReceiptImage() {
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const pickFromCamera = useCallback(async () => {
    setPickError(null);

    if (Platform.OS === 'web') {
      setPickError('A câmara não está disponível na web. Usa a galeria.');
      return;
    }

    const allowed = await ensureCameraPermission();
    if (!allowed) return;

    setIsPicking(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        // Qualidade alta no picker; compressão final no preprocess v3
        quality: 1,
        // Sem crop manual — evita cortar linhas de total/itens
        allowsEditing: false,
        exif: true,
      });

      if (!result.canceled && result.assets[0]) {
        setIsPreprocessing(true);
        try {
          setDraft(await buildDraftFromAsset(result.assets[0]));
        } finally {
          setIsPreprocessing(false);
        }
      }
    } catch {
      setPickError('Não foi possível optimizar a imagem. Tenta outra foto.');
    } finally {
      setIsPicking(false);
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    setPickError(null);

    const allowed = await ensureGalleryPermission();
    if (!allowed) return;

    setIsPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
        exif: true,
      });

      if (!result.canceled && result.assets[0]) {
        setIsPreprocessing(true);
        try {
          setDraft(await buildDraftFromAsset(result.assets[0]));
        } finally {
          setIsPreprocessing(false);
        }
      }
    } catch {
      setPickError('Não foi possível optimizar a imagem. Tenta outra foto.');
    } finally {
      setIsPicking(false);
    }
  }, []);

  const showSourcePicker = useCallback(() => {
    if (Platform.OS === 'web') {
      void pickFromGallery();
      return;
    }

    Alert.alert('Anexar talão', 'Como queres adicionar a foto?', [
      { text: 'Tirar foto', onPress: () => void pickFromCamera() },
      { text: 'Escolher da galeria', onPress: () => void pickFromGallery() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [pickFromCamera, pickFromGallery]);

  const remove = useCallback(() => {
    setDraft(null);
    setPickError(null);
  }, []);

  const reset = useCallback(() => {
    setDraft(null);
    setPickError(null);
    setIsPicking(false);
    setIsPreprocessing(false);
  }, []);

  return {
    draft,
    isPicking,
    isPreprocessing,
    pickError,
    pickFromCamera,
    pickFromGallery,
    showSourcePicker,
    remove,
    reset,
  };
}
