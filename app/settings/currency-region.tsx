import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsHero, SettingsScreenLayout } from '@/components/settings/SettingsScreenLayout';
import { Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

const CURRENCIES = ['EUR (€)', 'USD ($)', 'GBP (£)'] as const;
const REGIONS = ['Portugal', 'Brasil', 'Espanha', 'Outro'] as const;

type OptionGroupProps = {
  title: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
};

function OptionGroup({ title, options, value, onChange }: OptionGroupProps) {
  return (
    <View style={styles.group}>
      <Text variant="label" color="textMuted">
        {title}
      </Text>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.option, selected && styles.optionSelected]}>
              <Text variant="bodyMedium" color={selected ? 'primary' : 'textSecondary'}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function CurrencyRegionScreen() {
  const [currency, setCurrency] = useState<string>('EUR (€)');
  const [region, setRegion] = useState<string>('Portugal');

  return (
    <SettingsScreenLayout
      title="Moeda e região"
      subtitle="Formatação de valores e contexto local">
      <SettingsHero
        icon={{ ios: 'eurosign.circle', android: 'euro', web: 'euro' }}
        title="Preferências regionais"
        description="Define como os valores monetários e datas são apresentados."
      />

      <Card variant="elevated" style={styles.card}>
        <OptionGroup
          title="Moeda principal"
          options={CURRENCIES}
          value={currency}
          onChange={setCurrency}
        />
        <OptionGroup
          title="Região"
          options={REGIONS}
          value={region}
          onChange={setRegion}
        />
      </Card>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing['2xl'],
  },
  group: {
    gap: spacing.sm,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
});
