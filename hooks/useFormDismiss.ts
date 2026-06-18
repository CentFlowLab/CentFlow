import { useCallback } from 'react';

import { confirmDiscardChanges } from '@/lib/forms/discard-changes';

/** Fecho intencional (X, Cancelar) com confirmação se o formulário tiver alterações. */
export function useFormDismiss(onClose: () => void, isDirty: boolean) {
  return useCallback(() => {
    if (isDirty) {
      confirmDiscardChanges(onClose);
      return;
    }
    onClose();
  }, [isDirty, onClose]);
}
