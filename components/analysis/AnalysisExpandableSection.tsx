import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Card, Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type AnalysisExpandableSectionProps = {
  title: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

export function AnalysisExpandableSection({
  title,
  subtitle,
  defaultExpanded = false,
  children,
}: AnalysisExpandableSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card variant="elevated" style={styles.card}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="h3">{title}</Text>
          {subtitle ? (
            <Text variant="caption" color="textMuted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <SymbolView
          name={{
            ios: expanded ? 'chevron.up' : 'chevron.down',
            android: expanded ? 'expand_less' : 'expand_more',
            web: expanded ? 'expand_less' : 'expand_more',
          }}
          tintColor={colors.textMuted}
          size={20}
        />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  body: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});
