import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, FormSheetFooter, Text, TextField } from '@/components/ui';
import { useCreateGoal, useDeleteGoal, useUpdateGoal } from '@/hooks/queries/useAssets';
import { AnalyticsEvents, track, useAnalytics } from '@/lib/analytics';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formFieldsDiffer, formHasAnyText } from '@/lib/forms';
import type { Goal } from '@/lib/domain/assets.types';
import { createGoalSchema, updateGoalSchema } from '@/lib/domain/assets.schema';
import {
  formatGoalAmount,
  mapZodFieldErrors,
  parseGoalAmount,
} from '@/lib/domain/goal-form.utils';
import { getGoalProgress } from '@/lib/domain/goal.utils';
import { colors, formSpacing, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatInputDate } from '@/lib/utils/format';

import { GoalProgressBar } from './GoalProgressBar';

type GoalFormModalProps = {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  /** Quando definido, o modal entra em modo edição */
  goal?: Goal | null;
  onContribute?: (goal: Goal) => void;
  onWithdraw?: (goal: Goal) => void;
};

export function GoalFormModal({
  visible,
  onClose,
  onDismissed,
  goal = null,
  onContribute,
  onWithdraw,
}: GoalFormModalProps) {
  const isEditing = Boolean(goal);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  useAnalytics();

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const isSaving = createGoal.isPending || updateGoal.isPending;
  const isDeleting = deleteGoal.isPending;

  const baselineRef = useRef({ name: '', target: '', deadline: '' });

  useEffect(() => {
    if (!visible) return;

    if (goal) {
      const next = {
        name: goal.name,
        target: formatGoalAmount(goal.target),
        deadline: formatInputDate(goal.deadline),
      };
      setName(next.name);
      setTarget(next.target);
      setDeadline(next.deadline);
      baselineRef.current = next;
    } else {
      const empty = { name: '', target: '', deadline: '' };
      setName(empty.name);
      setTarget(empty.target);
      setDeadline(empty.deadline);
      baselineRef.current = empty;
    }

    setErrors({});
    setApiError(null);
    createGoal.reset();
    updateGoal.reset();
    deleteGoal.reset();
  }, [visible, goal?.id]);

  const isDirty = useMemo(() => {
    if (!visible) return false;
    if (goal) {
      return formFieldsDiffer({ name, target, deadline }, baselineRef.current);
    }
    return formHasAnyText(name, target, deadline);
  }, [visible, goal, name, target, deadline]);

  const progress = useMemo(() => {
    if (!isEditing || !goal) return null;
    const targetValue = parseGoalAmount(target);
    if (!target || Number.isNaN(targetValue) || targetValue <= 0) {
      return getGoalProgress(goal);
    }
    return getGoalProgress({
      ...goal,
      target: targetValue,
    });
  }, [isEditing, goal, target]);

  const preview = useMemo(() => {
    if (isEditing) return null;
    const targetValue = parseGoalAmount(target);
    if (!target || Number.isNaN(targetValue) || targetValue <= 0) {
      return null;
    }
    return getGoalProgress({
      id: 'preview',
      name: name || 'Objetivo',
      target: targetValue,
      current: 0,
    });
  }, [isEditing, name, target]);

  async function handleSave() {
    setApiError(null);
    setErrors({});

    if (isEditing && goal) {
      const result = updateGoalSchema.safeParse({
        name,
        target: parseGoalAmount(target),
        deadline: deadline || undefined,
      });

      if (!result.success) {
        setErrors(mapZodFieldErrors(result.error));
        return;
      }

      try {
        await updateGoal.mutateAsync({ id: goal.id, input: result.data });
        onClose();
      } catch (error) {
        setApiError(getApiErrorMessage(error, 'o objetivo'));
      }
      return;
    }

    const result = createGoalSchema.safeParse({
      name,
      target: parseGoalAmount(target),
      current: 0,
      deadline: deadline || undefined,
    });

    if (!result.success) {
      setErrors(mapZodFieldErrors(result.error));
      return;
    }

    try {
      await createGoal.mutateAsync(result.data);
      track(AnalyticsEvents.GOAL_CREATED, {
        target_amount: result.data.target,
      });
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
      onDismissed={onDismissed}
      isDirty={isDirty}
      maxHeight="92%"
      scrollContentStyle={styles.content}
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">{isEditing ? 'Editar objetivo' : 'Novo objetivo'}</Text>
            <Text variant="caption" color="textMuted">
              {isEditing
                ? 'Ajusta a meta e acompanha o progresso.'
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
      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          Meta
        </Text>
        <View style={styles.sectionBody}>
          <TextField
            label="Nome"
            value={name}
            onChangeText={setName}
            placeholder="Ex: Fundo de emergência"
            error={errors.name}
          />

          <TextField
            label="Valor alvo (€)"
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder="5000"
            error={errors.target}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          Prazo
        </Text>
        <View style={styles.sectionBody}>
          <DatePickerField
            label="Data prevista"
            value={deadline}
            onChange={setDeadline}
            error={errors.deadline}
          />

          <Pressable
            onPress={() => setDeadline(formatInputDate(new Date(Date.now() + 180 * 86400000)))}
            style={styles.quickDate}>
            <Text variant="caption" color="primary">
              +6 meses
            </Text>
          </Pressable>

          <Text variant="caption" color="textMuted">
            Opcional — ajuda a planear o ritmo de poupança
          </Text>
        </View>
      </View>

      {progress ? (
        <View style={styles.section}>
          <Text variant="label" color="textMuted">
            Progresso
          </Text>
          <Card variant="outlined" padding="md" style={styles.progressCard}>
            <View style={styles.progressStats}>
              <View style={styles.stat}>
                <Text variant="caption" color="textMuted">
                  Guardado
                </Text>
                <Text variant="bodyMedium">{formatCurrency(goal!.current)}</Text>
              </View>
              <View style={styles.stat}>
                <Text variant="caption" color="textMuted">
                  Em falta
                </Text>
                <Text variant="bodyMedium">{formatCurrency(progress.remaining)}</Text>
              </View>
              <View style={styles.stat}>
                <Text variant="caption" color="textMuted">
                  Progresso
                </Text>
                <Text variant="bodyMedium" color={progress.isComplete ? 'success' : 'primary'}>
                  {progress.percent}%
                </Text>
              </View>
            </View>
            <GoalProgressBar
              percent={progress.percent}
              isComplete={progress.isComplete}
              showLabel={false}
            />
          </Card>
        </View>
      ) : null}

      {preview ? (
        <View style={styles.section}>
          <Text variant="label" color="textMuted">
            Pré-visualização
          </Text>
          <Card variant="outlined" padding="md" style={styles.progressCard}>
            <View style={styles.previewRow}>
              <Text variant="bodyMedium">{formatCurrency(preview.remaining)} em falta</Text>
              <Text variant="bodyMedium" color="primary">
                {preview.percent}%
              </Text>
            </View>
            <GoalProgressBar
              percent={preview.percent}
              isComplete={preview.isComplete}
              showLabel={false}
            />
          </Card>
        </View>
      ) : null}

      {apiError ? (
        <Card variant="outlined" style={styles.errorCard}>
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        </Card>
      ) : null}

      <FormSheetFooter>
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

        {isEditing && goal && onContribute ? (
          <Button
            label="Adicionar dinheiro"
            variant="secondary"
            onPress={() => onContribute(goal)}
            disabled={isSaving || isDeleting}
            fullWidth
          />
        ) : null}

        {isEditing && goal && goal.current > 0 && onWithdraw ? (
          <Button
            label="Retirar dinheiro"
            variant="secondary"
            onPress={() => onWithdraw(goal)}
            disabled={isSaving || isDeleting}
            fullWidth
          />
        ) : null}

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
      </FormSheetFooter>
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
    marginBottom: formSpacing.titleToSubtitle,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.sm,
  },
  content: {
    gap: formSpacing.groupGap,
    paddingBottom: formSpacing.contentBottom,
  },
  section: {
    gap: spacing.sm,
  },
  sectionBody: {
    gap: formSpacing.fieldGap,
  },
  quickDate: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  progressCard: {
    gap: spacing.md,
    backgroundColor: colors.backgroundElevated,
  },
  progressStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    gap: spacing.xs,
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
