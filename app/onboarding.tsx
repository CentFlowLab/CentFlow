import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { useOnboarding } from '@/hooks/useOnboarding';
import { colors, radius, spacing } from '@/lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'welcome',
    icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
    title: 'Bem-vindo à CentFlow',
    description:
      'Controlo financeiro pessoal com clareza total — sabes exactamente para onde vai o teu dinheiro.',
    gradient: colors.gradientSurface,
  },
  {
    id: 'value',
    icon: { ios: 'chart.pie.fill', android: 'pie_chart', web: 'pie_chart' },
    title: 'Património, movimentos e preços',
    description:
      'Dashboard inteligente, análises profundas, tracking de preços e gestão de ativos num só lugar.',
    gradient: colors.gradientPrimary,
  },
  {
    id: 'start',
    icon: { ios: 'doc.text.viewfinder', android: 'document_scanner', web: 'document_scanner' },
    title: 'Começa com o primeiro movimento',
    description:
      'Adiciona uma transação manualmente ou digitaliza um talão — em segundos tens histórico real.',
    gradient: colors.gradientAccent,
  },
] as const;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { complete } = useOnboarding();
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(nextIndex);
  }

  async function handleFinish() {
    await complete();
    router.replace('/(tabs)/movimentos' as Href);
  }

  function handleNext() {
    if (isLast) {
      void handleFinish();
      return;
    }

    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  async function handleSkip() {
    await complete();
    router.replace('/(tabs)' as Href);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <Text variant="label" color="textMuted">
          CentFlow
        </Text>
        <Pressable onPress={handleSkip} hitSlop={12}>
          <Text variant="bodyMedium" color="textSecondary">
            Saltar
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <LinearGradient
              colors={[...item.gradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}>
              <View style={styles.iconWrap}>
                <SymbolView
                  name={item.icon}
                  tintColor={colors.text}
                  size={36}
                />
              </View>
            </LinearGradient>

            <Text variant="h1" style={styles.title}>
              {item.title}
            </Text>
            <Text variant="body" color="textSecondary" style={styles.description}>
              {item.description}
            </Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, dotIndex) => (
            <View
              key={slide.id}
              style={[styles.dot, dotIndex === index && styles.dotActive]}
            />
          ))}
        </View>

        <Button
          label={isLast ? 'Adicionar primeiro movimento' : 'Continuar'}
          onPress={handleNext}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  slide: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    height: 220,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceHighlight,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
});
