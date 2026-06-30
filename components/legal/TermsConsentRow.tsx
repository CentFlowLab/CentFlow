import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/ui';
import { openLegalDocument } from '@/lib/legal/open-legal-document';
import { colors, spacing } from '@/lib/theme';

type TermsConsentRowProps = {
  accepted: boolean;
  onToggle: (value: boolean) => void;
  error?: string;
};

export function TermsConsentRow({ accepted, onToggle, error }: TermsConsentRowProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => onToggle(!accepted)}
        style={styles.row}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel="Aceitar termos de utilização e política de privacidade">
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted ? (
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              tintColor={colors.textInverse}
              size={14}
            />
          ) : null}
        </View>
        <Text variant="caption" color="textSecondary" style={styles.label}>
          Li e aceito os{' '}
          <Text
            variant="caption"
            color="primary"
            onPress={() => void openLegalDocument('terms')}
            style={styles.link}>
            Termos de Utilização
          </Text>{' '}
          e a{' '}
          <Text
            variant="caption"
            color="primary"
            onPress={() => void openLegalDocument('privacy')}
            style={styles.link}>
            Política de Privacidade
          </Text>
          .
        </Text>
      </Pressable>
      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    flex: 1,
    lineHeight: 20,
  },
  link: {
    textDecorationLine: 'underline',
  },
  error: {
    marginLeft: 30,
  },
});
