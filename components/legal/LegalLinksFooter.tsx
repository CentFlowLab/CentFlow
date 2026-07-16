import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { appHref } from '@/lib/navigation/href';
import { spacing } from '@/lib/theme';

type LegalLinksFooterProps = {
  align?: 'center' | 'left';
};

export function LegalLinksFooter({ align = 'center' }: LegalLinksFooterProps) {
  return (
    <View style={[styles.row, align === 'center' && styles.centered]}>
      <Link href={appHref('legalPrivacy')} asChild>
        <Pressable accessibilityRole="link">
          <Text variant="caption" color="primary" style={styles.link}>
            Privacidade
          </Text>
        </Pressable>
      </Link>
      <Text variant="caption" color="textMuted">
        {' · '}
      </Text>
      <Link href={appHref('legalTerms')} asChild>
        <Pressable accessibilityRole="link">
          <Text variant="caption" color="primary" style={styles.link}>
            Termos
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  centered: {
    justifyContent: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
