import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AppHeader } from '@/components/layout';
import { Card, Text } from '@/components/ui';
import type { LegalDocument } from '@/lib/legal/types';
import { colors, spacing } from '@/lib/theme';

type LegalDocumentScreenProps = {
  document: LegalDocument;
};

export function LegalDocumentScreen({ document }: LegalDocumentScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="detail"
        title={document.title}
        subtitle={`Versão ${document.version} · ${document.lastUpdated}`}
        showBack
        onBack={() => router.back()}
        showAvatar={false}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing['3xl'] },
        ]}
        showsVerticalScrollIndicator={false}>
        <Card variant="outlined" style={styles.disclaimerCard} padding="md">
          <Text variant="caption" color="textMuted">
            {document.disclaimer}
          </Text>
        </Card>

        {document.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              {section.title}
            </Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text
                key={`${section.id}-p-${index}`}
                variant="body"
                color="textSecondary"
                style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
            {section.bullets?.map((bullet, index) => (
              <Text
                key={`${section.id}-b-${index}`}
                variant="body"
                color="textSecondary"
                style={styles.bullet}>
                · {bullet}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  disclaimerCard: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  paragraph: {
    lineHeight: 22,
  },
  bullet: {
    lineHeight: 22,
    paddingLeft: spacing.sm,
  },
});
