import { memo } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { colors, spacing } from '@/lib/theme';

type SwipeableAssetRowProps = {
  children: React.ReactNode;
  label: string;
  onDelete: () => void;
};

export const SwipeableAssetRow = memo(function SwipeableAssetRow({
  children,
  label,
  onDelete,
}: SwipeableAssetRowProps) {
  function confirmDelete() {
    const message = `Eliminar "${label}"?`;

    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm === 'function' && globalThis.confirm(message)) {
        onDelete();
      }
      return;
    }

    Alert.alert('Eliminar', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onDelete },
    ]);
  }

  function renderRightActions() {
    return (
      <Pressable
        onPress={confirmDelete}
        style={styles.deleteAction}
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ${label}`}>
        <SymbolView
          name={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
          tintColor={colors.textInverse}
          size={20}
        />
      </Pressable>
    );
  }

  if (Platform.OS === 'web') {
    return <View style={styles.wrapper}>{children}</View>;
  }

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      containerStyle={styles.wrapper}>
      {children}
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  deleteAction: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    marginBottom: spacing.md,
    borderRadius: 12,
  },
});
