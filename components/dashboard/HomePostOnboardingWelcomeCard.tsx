import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  dismissPostOnboardingWelcome,
  isPostOnboardingWelcomeDismissed,
} from '@/lib/onboarding/post-welcome-storage';
import {
  getPostOnboardingWelcome,
  getPostOnboardingWelcomeRoute,
  type PostOnboardingWelcome,
} from '@/lib/onboarding/welcome-priority';
import type { OnboardingAnswers } from '@/lib/onboarding/types';
import { colors, radius, spacing } from '@/lib/theme';

type HomePostOnboardingWelcomeCardProps = {
  answers: OnboardingAnswers;
  firstName: string;
};

export function HomePostOnboardingWelcomeCard({
  answers,
  firstName,
}: HomePostOnboardingWelcomeCardProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [welcome, setWelcome] = useState<PostOnboardingWelcome | null>(null);

  useEffect(() => {
    if (!user?.id || !answers.completed) return;
    let cancelled = false;

    void (async () => {
      const dismissed = await isPostOnboardingWelcomeDismissed(user.id);
      if (cancelled || dismissed) return;
      setWelcome(getPostOnboardingWelcome(answers, firstName));
      setVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [answers, firstName, user?.id]);

  if (!visible || !welcome) return null;

  async function handleDismiss() {
    if (user?.id) await dismissPostOnboardingWelcome(user.id);
    setVisible(false);
  }

  function handleCta() {
    void handleDismiss();
    router.push(getPostOnboardingWelcomeRoute(welcome!.action) as Href);
  }

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.emojiBox}>
          <Text style={styles.emoji}>{welcome.emoji}</Text>
        </View>
        <Pressable onPress={() => void handleDismiss()} hitSlop={12} style={styles.close}>
          <Text variant="caption" color="textMuted">
            ✕
          </Text>
        </Pressable>
      </View>
      <Text variant="h2">{welcome.title}</Text>
      <Text variant="body" color="textSecondary" style={styles.message}>
        {welcome.message}
      </Text>
      <Button label={welcome.ctaLabel} onPress={handleCta} fullWidth size="lg" />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  close: {
    padding: spacing.xs,
  },
  message: {
    lineHeight: 22,
  },
});
