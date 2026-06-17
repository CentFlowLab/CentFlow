import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { spacing } from '@/lib/theme';

type OnboardingStepHeaderProps = {
  title: string;
  lead?: string;
  context?: string;
};

export function OnboardingStepHeader({ title, lead, context }: OnboardingStepHeaderProps) {
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.wrap}>
      <Text variant="h1" style={styles.title}>
        {title}
      </Text>
      {lead ? (
        <Text variant="body" color="textSecondary" style={styles.lead}>
          {lead}
        </Text>
      ) : null}
      {context ? (
        <View style={styles.contextBox}>
          <Text variant="caption" color="textMuted" style={styles.context}>
            {context}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  title: {
    lineHeight: 36,
  },
  lead: {
    lineHeight: 24,
  },
  contextBox: {
    paddingTop: spacing.xs,
  },
  context: {
    lineHeight: 20,
  },
});
