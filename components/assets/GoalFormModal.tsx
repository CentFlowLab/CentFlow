import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useCreateGoal, useDeleteGoal, useUpdateGoal } from '@/hooks/queries/useAssets';
import { AnalyticsEvents, track, useAnalytics } from '@/lib/analytics';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Goal } from '@/lib/domain/assets.types';
import { createGoalSchema } from '@/lib/domain/assets.schema';
import {
  formatGoalAmount,
  mapZodFieldErrors,
  parseGoalAmount,
} from '@/lib/domain/goal-form.utils';
import { getGoalProgress } from '@/lib/domain/goal.utils';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, toIsoDateString } from '@/lib/utils/format';

import { GoalProgressBar } from './GoalProgressBar';

type GoalFormModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Quando definido, o modal entra em modo edição */
  goal?: Goal | null;
};

export function GoalFormModal({ visible, onClose, goal = null }: GoalFormModalProps) {
  const isEditing = Boolean(goal);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  useAnalytics();

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const isSaving = createGoal.isPending || updateGoal.isPending;
  const isDeleting = deleteGoal.isPending;

  useEffect(() => {
    if (!visible) return;

    if (goal) {
      setName(goal.name);
      setTarget(formatGoalAmount(goal.target));
      setCurrent(formatGoalAmount(goal.current));
      setDeadline(goal.deadline ?? '');
    } else {
      setName('');
      setTarget('');
      setCurrent('');
      setDeadline('');
    }

    setErrors({});
    setApiError(null);
    createGoal.reset();
    updateGoal.reset();
    deleteGoal.reset();
    // Mutations mudam de referência a cada render — só re-inicializar ao abrir ou mudar item.
  }, [visible, goal?.id]);

  const preview = useMemo(() => {
    const targetValue = parseGoalAmount(target);
    const currentValue = current ? parseGoalAmount(current) : 0;

    if (!target || Number.isNaN(targetValue) || targetValue <= 0) {
      return null;
    }

    return getGoalProgress({
      id: goal?.id ?? 'preview',
      name: name || 'Objetivo',
      target: targetValue,
      current: Number.isNaN(currentValue) ? 0 : currentValue,
    });
  }, [goal?.id, name, target, current]);

  async function handleSave() {
    setApiError(null);
    setErrors({});

    const result = createGoalSchema.safeParse({
      name,
      target: parseGoalAmount(target),
      current: current ? parseGoalAmount(current) : 0,
      deadline: deadline || undefined,
    });

    if (!result.success) {
      setErrors(mapZodFieldErrors(result.error));
      return;
    }

    try {
      if (isEditing && goal) {
        await updateGoal.mutateAsync({ id: goal.id, input: result.data });
      } else {
        await createGoal.mutateAsync(result.data);
        // Analytics: only on successful creation (not edits)
        track(AnalyticsEvents.GOAL_CREATED, {
          target_amount: result.data.target,
        });
      }
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o objetivo'));
    }
  }

  function confirmDelete() {
    if (!goal) return;

    const message = `Eliminar "${goal.name}"? Esta acção não pode ser desfeita.`;

    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm === 'function' && globalThis.confirm(message)) {
        void executeDelete();
      }
      return;
    }

    Alert.alert('Eliminar objetivo', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void executeDelete() },
    ]);
  }

  async function executeDelete() {
    if (!goal) return;

    try {
      await deleteGoal.mutateAsync(goal.id);
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o objetivo'));
    }
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="92%"
      scrollContentStyle={styles.content}
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">{isEditing ? 'Editar objetivo' : 'Novo objetivo'}</Text>
            <Text variant="caption" color="textMuted">
              {isEditing
                ? 'Actualiza o progresso, meta ou data prevista'
                : 'Define uma meta de poupança com progresso visível'}
            </Text>
          </View>
          <Pressable onPress={requestClose} hitSlop={12} accessibilityLabel="Fechar">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={28}
            />
          </Pressable>
        </View>
      )}>
      <TextField
        label="Nome"
        value={name}
        onChangeText={setName}
        placeholder="Ex: Fundo de emergência"
        error={errors.name}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <TextField
            label="Valor alvo (€)"
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder="5000"
            error={errors.target}
          />
        </View>
        <View style={styles.halfField}>
          <TextField
            label="Valor actual (€)"
            value={current}
            onChangeText={setCurrent}
            keyboardType="decimal-pad"
            placeholder="0"
            error={errors.current}
          />
        </View>
      </View>

      <TextField
        label="Data prevista"
        value={deadline}
        onChangeText={setDeadline}
        placeholder="AAAA-MM-DD"
        error={errors.deadline}
      />
      <Text variant="caption" color="textMuted" style={styles.helper}>
        Opcional — ajuda a planear o ritmo de poupança
      </Text>

      <Pressable
        onPress={() => setDeadline(toIsoDateString(new Date(Date.now() + 180 * 86400000)))}
        style={styles.quickDate}>
        <Text variant="caption" color="primary">
          +6 meses
        </Text>
      </Pressable>

      {preview ? (
        <Card variant="outlined" padding="md" style={styles.previewCard}>
          <Text variant="label" color="textMuted">
            Progresso
          </Text>
          <View style={styles.previewRow}>
            <Text variant="bodyMedium">
              {preview.isComplete
                ? 'Objetivo concluído'
                : `${formatCurrency(preview.remaining)} em falta`}
            </Text>
            <Text variant="bodyMedium" color={preview.isComplete ? 'success' : 'primary'}>
              {preview.percent}%
            </Text>
          </View>
          <GoalProgressBar
            percent={preview.percent}
            isComplete={preview.isComplete}
            showLabel={false}
          />
        </Card>
      ) : null}

      {apiError ? (
        <Card variant="outlined" style={styles.errorCard}>
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        </Card>
      ) : null}

      <Button
        label={
          isSaving
            ? isEditing
              ? 'A guardar...'
              : 'A criar...'
            : isEditing
              ? 'Guardar alterações'
              : 'Criar objetivo'
        }
        onPress={handleSave}
        loading={isSaving}
        disabled={isDeleting}
        fullWidth
        size="lg"
        icon={
          <SymbolView
            name={{ ios: 'target', android: 'flag', web: 'flag' }}
            tintColor={colors.textInverse}
            size={18}
          />
        }
      />

      {isEditing ? (
        <Button
          label={isDeleting ? 'A eliminar...' : 'Eliminar objetivo'}
          variant="danger"
          onPress={confirmDelete}
          loading={isDeleting}
          disabled={isSaving}
          fullWidth
        />
      ) : null}
    </DraggableBottomSheet>
  );
}

/** @deprecated Usa GoalFormModal */
export function AddGoalModal(props: Omit<GoalFormModalProps, 'goal'>) {
  return <GoalFormModal {...props} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  quickDate: {
    alignSelf: 'flex-start',
    marginTop: -spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  helper: {
    marginTop: -spacing.sm,
  },
  previewCard: {
    gap: spacing.sm,
    backgroundColor: colors.backgroundElevated,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
