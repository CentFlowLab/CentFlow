import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { declineImport, type ImportProgress, type LocalStore } from '@/data';
import { Dialog } from '@/ui/components';

type Step = 'ask' | 'importing' | 'confirmed' | 'pending' | 'failed';

type Props = {
  visible: boolean;
  account: LocalStore;
  onStart: () => Promise<ImportProgress | null>;
  onClose: () => void;
};

/**
 * Pergunta explícita depois de entrar: juntar à conta os dados criados sem conta neste
 * dispositivo. Nada é importado sem esta decisão e nada é apagado antes da confirmação.
 */
export function ImportDialog({ visible, account, onStart, onClose }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('ask');

  const close = () => {
    setStep('ask');
    onClose();
  };

  const start = async () => {
    setStep('importing');
    try {
      const result = await onStart();
      setStep(result?.status === 'confirmed' ? 'confirmed' : 'pending');
    } catch {
      setStep('failed');
    }
  };

  if (step === 'confirmed' || step === 'pending' || step === 'failed') {
    return (
      <Dialog
        visible={visible}
        title={t(`importData.${step}.title`)}
        message={t(`importData.${step}.message`)}
        onDismiss={close}
        actions={[{ label: t('common.ok'), onPress: close }]}
      />
    );
  }

  return (
    <Dialog
      visible={visible}
      title={t('importData.title')}
      message={t('importData.message')}
      onDismiss={step === 'importing' ? () => undefined : close}
      actions={[
        { label: t('importData.import'), onPress: start, loading: step === 'importing' },
        {
          label: t('importData.keepSeparate'),
          variant: 'secondary',
          disabled: step === 'importing',
          onPress: () => {
            void declineImport(account).finally(close);
          },
        },
        {
          label: t('importData.later'),
          variant: 'ghost',
          disabled: step === 'importing',
          onPress: close,
        },
      ]}
    />
  );
}
