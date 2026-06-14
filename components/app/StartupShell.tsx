import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@/lib/theme';

type StartupShellProps = ViewProps & {
  children: React.ReactNode;
};

/** Garante fundo sólido durante arranque — evita flash preto/branco com edge-to-edge. */
export function StartupShell({ children, style, ...rest }: StartupShellProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
