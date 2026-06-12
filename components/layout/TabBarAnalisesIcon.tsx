import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/lib/theme';

type TabBarAnalisesIconProps = {
  focused: boolean;
};

export function TabBarAnalisesIcon({ focused }: TabBarAnalisesIconProps) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={
          focused
            ? [colors.primary, colors.primaryDark]
            : [colors.surfaceElevated, colors.surfaceHighlight]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.circle, focused && styles.circleFocused]}>
        <SymbolView
          name={{
            ios: 'chart.pie.fill',
            android: 'pie_chart',
            web: 'pie_chart',
          }}
          tintColor={focused ? colors.textInverse : colors.primary}
          size={focused ? 28 : 24}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.tabBar,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  circleFocused: {
    borderColor: colors.background,
    shadowOpacity: 0.4,
  },
});
