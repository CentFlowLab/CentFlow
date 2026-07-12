import { useSyncExternalStore } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { getActiveThemeColors, subscribeTheme } from '@/lib/theme/theme-store';

type StartupShellProps = ViewProps & {
  children: React.ReactNode;
};

function useThemeBackgroundColor() {
  return useSyncExternalStore(
    subscribeTheme,
    () => getActiveThemeColors().background,
    () => getActiveThemeColors().background,
  );
}

/** Garante fundo sólido durante arranque — evita flash preto/branco com edge-to-edge. */
export function StartupShell({ children, style, ...rest }: StartupShellProps) {
  const backgroundColor = useThemeBackgroundColor();

  return (
    <View style={[styles.root, { backgroundColor }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
