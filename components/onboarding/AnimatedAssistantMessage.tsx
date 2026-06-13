import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

type AnimatedAssistantMessageProps = {
  messages: string[];
  onComplete?: () => void;
  intervalMs?: number;
};

export function AnimatedAssistantMessage({
  messages,
  onComplete,
  intervalMs = 1800,
}: AnimatedAssistantMessageProps) {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    setVisibleCount(1);
  }, [messages]);

  useEffect(() => {
    if (visibleCount >= messages.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setVisibleCount((count) => count + 1);
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [visibleCount, messages.length, intervalMs, onComplete]);

  return (
    <View style={styles.container}>
      {messages.slice(0, visibleCount).map((message, index) => (
        <Animated.View
          key={`${message}-${index}`}
          entering={FadeIn.duration(400)}
          style={styles.bubble}>
          <Text variant="body" color="textSecondary" style={styles.message}>
            {message}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  bubble: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  message: {
    lineHeight: 24,
  },
});
