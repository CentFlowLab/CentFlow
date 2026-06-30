import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  attachReceiptToEntity,
  openReceiptUrl,
  showAttachReceiptPicker,
  type AttachReceiptEntityType,
} from '@/lib/receipt/attach-entity-receipt';
import { colors, spacing } from '@/lib/theme';

type AttachReceiptButtonProps = {
  entityType: AttachReceiptEntityType;
  entityId: string;
  existingReceiptUrl?: string;
  onAttached: (receiptUrl: string) => void;
  disabled?: boolean;
};

export function AttachReceiptButton({
  entityType,
  entityId,
  existingReceiptUrl,
  onAttached,
  disabled = false,
}: AttachReceiptButtonProps) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleAttach(source: 'camera' | 'gallery' | 'pdf') {
    setLoading(true);
    try {
      const url = await attachReceiptToEntity(entityType, entityId, source);
      onAttached(url);
    } catch (error) {
      if (error instanceof Error && error.message !== 'Seleção cancelada') {
        showToast('Não foi possível anexar a fatura.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePressAttach() {
    showAttachReceiptPicker((source) => {
      void handleAttach(source);
    });
  }

  async function handleView() {
    if (!existingReceiptUrl) return;
    try {
      await openReceiptUrl(existingReceiptUrl);
    } catch {
      showToast('Não foi possível abrir a fatura.', 'error');
    }
  }

  if (loading) {
    return (
      <View style={styles.row}>
        <ActivityIndicator color={colors.primary} />
        <Text variant="caption" color="textMuted">
          A anexar fatura...
        </Text>
      </View>
    );
  }

  if (existingReceiptUrl) {
    return (
      <View style={styles.row}>
        <Button label="Ver fatura" variant="secondary" onPress={() => void handleView()} />
        <Pressable onPress={handlePressAttach} disabled={disabled}>
          <Text variant="bodyMedium" color="primary">
            Substituir fatura
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Button
      label="Anexar fatura"
      variant="secondary"
      onPress={handlePressAttach}
      disabled={disabled}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
});
