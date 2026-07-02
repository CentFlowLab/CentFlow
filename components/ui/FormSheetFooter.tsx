import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { formSpacing, spacing } from '@/lib/theme';

type FormSheetFooterProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Área de acções finais em bottom sheets — margem superior consistente. */
export function FormSheetFooter({ children, style }: FormSheetFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  footer: {
    marginTop: formSpacing.footerTop,
    paddingTop: spacing.lg,
    gap: formSpacing.footerGap,
  },
});
