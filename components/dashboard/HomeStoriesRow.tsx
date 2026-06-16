import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

export type HomeStoryId = 'profile' | 'changes' | 'attention';

type HomeStoryItem = {
  id: HomeStoryId;
  label: string;
  icon: SymbolViewProps['name'];
  gradient: readonly [string, string];
  hasNotification: boolean;
};

type HomeStoriesRowProps = {
  unread: Record<HomeStoryId, boolean>;
  onStoryPress: (id: HomeStoryId) => void;
};

export function HomeStoriesRow({ unread, onStoryPress }: HomeStoriesRowProps) {
  const stories: HomeStoryItem[] = [
    {
      id: 'profile',
      label: 'Perfil financeiro',
      icon: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
      gradient: [colors.primaryDark, colors.primary],
      hasNotification: unread.profile,
    },
    {
      id: 'changes',
      label: 'O que mudou',
      icon: {
        ios: 'arrow.triangle.2.circlepath',
        android: 'sync',
        web: 'sync',
      },
      gradient: ['#1E3A5F', '#2563EB'],
      hasNotification: unread.changes,
    },
    {
      id: 'attention',
      label: 'Precisa atenção',
      icon: {
        ios: 'exclamationmark.circle.fill',
        android: 'error',
        web: 'error',
      },
      gradient: ['#7C2D12', colors.warning],
      hasNotification: unread.attention,
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}>
      {stories.map((story) => (
        <Pressable
          key={story.id}
          onPress={() => onStoryPress(story.id)}
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          accessibilityRole="button"
          accessibilityLabel={story.label}>
          <View style={[styles.ring, story.hasNotification && styles.ringActive]}>
            <LinearGradient
              colors={[...story.gradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.circle}>
              <SymbolView
                name={story.icon}
                tintColor={colors.textInverse}
                size={26}
              />
            </LinearGradient>
          </View>
          <Text variant="caption" color="textSecondary" style={styles.label} numberOfLines={2}>
            {story.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const STORY_SIZE = 68;

const styles = StyleSheet.create({
  scroll: {
    marginBottom: spacing.lg,
  },
  row: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  item: {
    width: 88,
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemPressed: {
    opacity: 0.85,
  },
  ring: {
    borderRadius: radius.full,
    padding: 2,
  },
  ringActive: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    padding: 1,
  },
  circle: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
    lineHeight: 16,
    minHeight: 32,
  },
});
