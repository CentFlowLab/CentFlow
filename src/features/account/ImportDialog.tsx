import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ANONYMOUS_SPACE,
  declineImport,
  deleteLocalSpace,
  type ImportProgress,
  type LocalStore,
} from '@/data';
import { Dialog } from '@/ui/components';

type Step = 'ask' | 'importing' | 'confirmDelete' | 'deleting' | 'confirmed' | 'pending' | 'failed';

type Props = {
  visible: boolean;
  account: LocalStore;
  onStart: () => Promise<ImportProgress | null>;
  onClose: () => void;
};

/**
 * Pergunta explícita depois de entrar: o Miven só guarda dados com conta (ADR-034), por isso os
 * dados que ficaram sem conta neste dispositivo ou entram na conta ou são apagados. Nada é
 * importado nem apagado sem esta decisão; apagar pede uma segunda confirmação.
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

  const removeAnonymousData = async () => {
    setStep('deleting');
    try {
      await declineImport(account);
      await deleteLocalSpace(ANONYMOUS_SPACE);
      close();
    } catch {
      setStep('failed');
    }
  };

  if (step === 'confirmDelete' || step === 'deleting') {
    return (
      <Dialog
        visible={visible}
        title={t('importData.deleteTitle')}
        message={t('importData.deleteMessage')}
        onDismiss={step === 'deleting' ? () => undefined : () => setStep('ask')}
        actions={[
          {
            label: t('importData.deleteConfirm'),
            variant: 'destructive',
            loading: step === 'deleting',
            onPress: () => void removeAnonymousData(),
          },
          {
            label: t('common.back'),
            variant: 'secondary',
            disabled: step === 'deleting',
            onPress: () => setStep('ask'),
          },
        ]}
      />
    );
  }

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
          label: t('importData.delete'),
          variant: 'secondary',
          disabled: step === 'importing',
          onPress: () => setStep('confirmDelete'),
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
