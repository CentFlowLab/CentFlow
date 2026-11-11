import { useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { VEHICLE_COST_TYPES, ValidationError, type VehicleCostType } from '@/core/finance';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  Divider,
  FormScreen,
  Icon,
  Text,
  TextField,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { EntryListItem } from '../finance/EntryListItem';
import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useFinanceLookups } from '../finance/useFinanceLookups';

/** Na associação em lote, a compra marca-se num movimento de cada vez (ADR-054). */
const BULK_COST_TYPES = VEHICLE_COST_TYPES.filter((type) => type !== 'purchase');

/** Associar movimentos existentes a um veículo: `/vehicles/link/[id]`. */
export function LinkEntriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const repositories = useRepositories();
  const lookups = useFinanceLookups();
  const [search, setSearch] = useState('');
  const [costType, setCostType] = useState<VehicleCostType>('maintenance');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const page = useDataQuery(
    useCallback(
      (repos: Repositories) => repos.entries.list({ withoutVehicle: true, search, limit: 100 }),
      [search],
    ),
  );
  const close = () => closeModal(`/vehicles/${id}`);

  const toggle = (entryId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await repositories.entries.linkVehicle([...selected], {
        vehicleId: id,
        vehicleCostType: costType,
      });
      close();
    } catch (cause) {
      setSaving(false);
      setError(
        cause instanceof ValidationError
          ? (validationMessage(t, Object.values(cause.errors)[0]) ?? t('errors.saveFailed'))
          : t('errors.saveFailed'),
      );
    }
  }

  const count = selected.size;
  return (
    <FormScreen
      title={t('vehicles.linkScreen.title')}
      closeLabel={t('common.close')}
      onClose={close}
      footer={
        <View style={styles.footer}>
          {error ? (
            <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button
            label={
              count === 0
                ? t('vehicles.linkScreen.saveNone')
                : t('vehicles.linkScreen.save', { count })
            }
            icon="link-outline"
            fullWidth
            disabled={count === 0}
            loading={saving}
            onPress={() => void save()}
          />
        </View>
      }>
      <Text variant="footnote" tone="secondary">
        {t('vehicles.linkScreen.hint')}
      </Text>
      <ChipGroup label={t('vehicles.linkScreen.costType')}>
        {BULK_COST_TYPES.map((type) => (
          <Chip
            key={type}
            label={t(`vehicles.costTypes.${type}`)}
            selected={type === costType}
            onPress={() => setCostType(type)}
          />
        ))}
      </ChipGroup>
      <TextField
        label={t('vehicles.linkScreen.search')}
        value={search}
        onChangeText={setSearch}
        placeholder={t('vehicles.linkScreen.searchPlaceholder')}
        autoCorrect={false}
        returnKeyType="search"
      />
      {!page.data || !lookups.data ? (
        <ActivityIndicator />
      ) : page.data.items.length === 0 ? (
        <Text variant="footnote" tone="secondary">
          {t('vehicles.linkScreen.empty')}
        </Text>
      ) : (
        <Card padding="xs">
          <View accessibilityRole="list">
            {page.data.items.map((entry, index) => {
              const checked = selected.has(entry.id);
              return (
                <Fragment key={entry.id}>
                  {index > 0 ? <Divider /> : null}
                  <View
                    style={styles.row}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    aria-checked={checked}>
                    <View style={styles.flex}>
                      <EntryListItem
                        entry={entry}
                        lookups={lookups.data!}
                        onPress={() => toggle(entry.id)}
                      />
                    </View>
                    <View style={styles.check} pointerEvents="none">
                      <Icon
                        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={checked ? 'primaryText' : 'textTertiary'}
                      />
                    </View>
                  </View>
                </Fragment>
              );
            })}
          </View>
        </Card>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  check: { paddingRight: spacing.md },
});
