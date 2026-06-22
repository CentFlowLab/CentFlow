import * as DocumentPicker from 'expo-document-picker';

import * as ImagePicker from 'expo-image-picker';

import { useCallback, useState } from 'react';

import { Alert, Platform } from 'react-native';



import type { ReceiptDraft } from '@/lib/domain/receipt.types';
import { traceOcrStep } from '@/lib/doctor';
import {

  applyOcrImageSource,

  hasDigitizedVariant,

  isPdfReceipt,

  preparePdfReceiptDraft,

  preprocessReceiptImage,

} from '@/lib/receipt/receipt-image-preprocess';



async function buildDraftFromAsset(

  asset: ImagePicker.ImagePickerAsset,

): Promise<ReceiptDraft> {

  const fileName = asset.fileName ?? `receipt-${Date.now()}.jpg`;



  return preprocessReceiptImage(asset.uri, {

    originalWidth: asset.width,

    originalHeight: asset.height,

    fileName,

    mimeType: asset.mimeType ?? undefined,

    exif: asset.exif ?? undefined,

  });

}



async function buildDraftFromDocument(

  asset: DocumentPicker.DocumentPickerAsset,

): Promise<ReceiptDraft> {

  const fileName = asset.name ?? `document-${Date.now()}`;

  const mimeType = asset.mimeType ?? undefined;



  if (isPdfReceipt(mimeType, fileName)) {

    return preparePdfReceiptDraft(asset.uri, fileName);

  }



  if (mimeType?.startsWith('image/') || /\.(jpe?g|png|heic|webp)$/i.test(fileName)) {

    return preprocessReceiptImage(asset.uri, {

      fileName,

      mimeType,

    });

  }



  throw new Error('Formato não suportado. Usa imagem (JPG/PNG) ou PDF.');

}



function shouldPreviewDigitized(draft: ReceiptDraft): boolean {

  return hasDigitizedVariant(draft);

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

  const [pendingDraft, setPendingDraft] = useState<ReceiptDraft | null>(null);

  const [digitizeSelection, setDigitizeSelection] = useState<'digitized' | 'original'>(

    'digitized',

  );

  const [isPicking, setIsPicking] = useState(false);

  const [isPreprocessing, setIsPreprocessing] = useState(false);

  const [pickError, setPickError] = useState<string | null>(null);



  const stageDraft = useCallback((next: ReceiptDraft) => {
    traceOcrStep('image_selected', {
      screen: 'movement_create',
      component: 'useReceiptImage',
      payload: {
        mimeType: next.mimeType ?? 'unknown',
        isPdf: Boolean(next.mimeType?.includes('pdf')),
      },
    });

    if (shouldPreviewDigitized(next)) {

      setDigitizeSelection('digitized');

      setPendingDraft(next);

      return;

    }

    setDraft(next);

  }, []);



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

        quality: 1,

        allowsEditing: false,

        exif: true,

      });



      if (!result.canceled && result.assets[0]) {

        setIsPreprocessing(true);

        try {

          stageDraft(await buildDraftFromAsset(result.assets[0]));

        } finally {

          setIsPreprocessing(false);

        }

      }

    } catch (error) {

      if (__DEV__) console.warn('[useReceiptImage] camera preprocess failed', error);

      setPickError(

        'Não foi possível preparar a foto. Tenta outra imagem com boa luz e foco.',

      );

    } finally {

      setIsPicking(false);

    }

  }, [stageDraft]);



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

          stageDraft(await buildDraftFromAsset(result.assets[0]));

        } finally {

          setIsPreprocessing(false);

        }

      }

    } catch (error) {

      if (__DEV__) console.warn('[useReceiptImage] gallery preprocess failed', error);

      setPickError(

        'Não foi possível preparar a imagem. Tenta JPG/PNG ou importa o PDF directamente.',

      );

    } finally {

      setIsPicking(false);

    }

  }, [stageDraft]);



  const pickFromDocument = useCallback(async () => {

    setPickError(null);

    setIsPicking(true);



    try {

      const result = await DocumentPicker.getDocumentAsync({

        type: ['application/pdf', 'image/*'],

        copyToCacheDirectory: true,

        multiple: false,

      });



      if (!result.canceled && result.assets?.[0]) {

        setIsPreprocessing(true);

        try {

          stageDraft(await buildDraftFromDocument(result.assets[0]));

        } finally {

          setIsPreprocessing(false);

        }

      }

    } catch (error) {

      if (__DEV__) console.warn('[useReceiptImage] document pick failed', error);

      setPickError('Não foi possível abrir o ficheiro. Tenta um PDF ou imagem.');

    } finally {

      setIsPicking(false);

    }

  }, [stageDraft]);



  const showSourcePicker = useCallback(() => {

    if (Platform.OS === 'web') {

      void pickFromDocument();

      return;

    }



    Alert.alert('Anexar talão ou fatura', 'Como queres adicionar o documento?', [

      { text: 'Tirar foto', onPress: () => void pickFromCamera() },

      { text: 'Galeria (imagem)', onPress: () => void pickFromGallery() },

      { text: 'PDF / ficheiro', onPress: () => void pickFromDocument() },

      { text: 'Cancelar', style: 'cancel' },

    ]);

  }, [pickFromCamera, pickFromGallery, pickFromDocument]);



  const confirmPendingDraft = useCallback(() => {

    if (!pendingDraft) return;

    setDraft(applyOcrImageSource(pendingDraft, digitizeSelection));

    setPendingDraft(null);

  }, [pendingDraft, digitizeSelection]);



  const discardPendingDraft = useCallback(() => {

    setPendingDraft(null);

    setDigitizeSelection('digitized');

  }, []);



  const remove = useCallback(() => {

    setDraft(null);

    setPendingDraft(null);

    setPickError(null);

    setDigitizeSelection('digitized');

  }, []);



  const reset = useCallback(() => {

    setDraft(null);

    setPendingDraft(null);

    setPickError(null);

    setIsPicking(false);

    setIsPreprocessing(false);

    setDigitizeSelection('digitized');

  }, []);



  return {

    draft,

    pendingDraft,

    digitizeSelection,

    setDigitizeSelection,

    confirmPendingDraft,

    discardPendingDraft,

    isPicking,

    isPreprocessing,

    pickError,

    pickFromCamera,

    pickFromGallery,

    pickFromDocument,

    showSourcePicker,

    remove,

    reset,

  };

}


