import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import type { OcrConfidenceLevel } from '@/lib/receipt/ocr-confidence';
import { getOcrFieldTone } from '@/lib/receipt/ocr-confidence';
import { colors, radius, spacing } from '@/lib/theme';
import {
  DATE_INPUT_PLACEHOLDER,
  dateToInputDate,
  inputDateToDate,
} from '@/lib/utils/format';

import { Button } from './Button';
import { CentFlowCalendar } from './CentFlowCalendar';
import { Text } from './Text';

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  ocrHighlighted?: boolean;
  ocrEdited?: boolean;
  ocrConfidenceLevel?: OcrConfidenceLevel;
};

const OCR_BADGE_LABELS: Record<OcrConfidenceLevel, string> = {
  high: 'OCR alto',
  medium: 'OCR médio',
  low: 'OCR baixo',
  unknown: 'OCR',
};

export function DatePickerField({
  label,
  value,
  onChange,
  error,
  placeholder = DATE_INPUT_PLACEHOLDER,
  minimumDate,
  maximumDate,
  ocrHighlighted,
  ocrEdited,
  ocrConfidenceLevel,
}: DatePickerFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => inputDateToDate(value) ?? new Date());

  const displayValue = value.trim() || '';
  const resolvedDate = useMemo(
    () => inputDateToDate(value) ?? new Date(),
    [value],
  );

  const level = ocrConfidenceLevel ?? 'unknown';
  const ocrTone = ocrHighlighted ? getOcrFieldTone(level) : null;
  const useCustomCalendar = Platform.OS === 'android' || Platform.OS === 'web';

  function applyDate(date: Date) {
    onChange(dateToInputDate(date));
  }

  function handleIosPickerChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (selectedDate) {
      setDraft(selectedDate);
    }
  }

  function openPicker() {
    setDraft(resolvedDate);
    setPickerOpen(true);
  }

  function confirmPicker() {
    applyDate(draft);
    setPickerOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </Text>
        {ocrHighlighted ? (
          <View style={[styles.ocrBadge, { backgroundColor: ocrTone?.badgeBg }]}>
            <Text variant="caption" style={[styles.ocrBadgeText, { color: ocrTone?.badge }]}>
              {OCR_BADGE_LABELS[level]}
            </Text>
          </View>
        ) : null}
        {ocrEdited ? (
          <View style={[styles.ocrBadge, styles.editedBadge]}>
            <Text variant="caption" style={styles.editedBadgeText}>
              Editado
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}, abrir calendário`}
        style={({ pressed }) => [
          styles.field,
          ocrTone && {
            borderColor: ocrTone.border,
            backgroundColor: ocrTone.background,
          },
          error ? styles.fieldError : null,
          pressed && styles.fieldPressed,
        ]}>
        <Text variant="body" color={displayValue ? 'text' : 'textMuted'} style={styles.value}>
          {displayValue || placeholder}
        </Text>
        <SymbolView
          name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
          tintColor={colors.primary}
          size={20}
        />
      </Pressable>

      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {pickerOpen && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setPickerOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
            <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
              <Text variant="h3" style={styles.modalTitle}>
                {label}
              </Text>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                onChange={handleIosPickerChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                themeVariant="dark"
                locale="pt-PT"
                style={styles.iosPicker}
              />
              <View style={styles.modalActions}>
                <Button label="Cancelar" variant="ghost" onPress={() => setPickerOpen(false)} style={styles.modalBtn} />
                <Button label="Confirmar" onPress={confirmPicker} style={styles.modalBtn} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {pickerOpen && useCustomCalendar ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setPickerOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
            <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
              <Text variant="h3" style={styles.modalTitle}>
                {label}
              </Text>
              <CentFlowCalendar
                value={draft}
                onChange={setDraft}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
              />
              <View style={styles.modalActions}>
                <Button label="Cancelar" variant="ghost" onPress={() => setPickerOpen(false)} style={styles.modalBtn} />
                <Button label="Confirmar" onPress={confirmPicker} style={styles.modalBtn} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontWeight: '500',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  fieldPressed: {
    borderColor: colors.primary,
    opacity: 0.92,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  value: {
    flex: 1,
    fontSize: 15,
  },
  error: {
    marginTop: spacing.xs,
  },
  ocrBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  ocrBadgeText: {
    fontWeight: '700',
    fontSize: 10,
  },
  editedBadge: {
    backgroundColor: colors.surfaceHighlight,
  },
  editedBadgeText: {
    fontWeight: '600',
    fontSize: 10,
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    marginBottom: spacing.sm,
  },
  iosPicker: {
    alignSelf: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
});
