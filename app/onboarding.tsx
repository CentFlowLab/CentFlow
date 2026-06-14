import { type Href, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import {
  AnimatedAssistantMessage,
  OnboardingShell,
  SelectableCard,
} from '@/components/onboarding';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { useOnboarding, useOnboardingAnswersState } from '@/hooks/useOnboarding';
import { useUpdateProfile } from '@/hooks/mutations/useProfileMutations';
import { AnalyticsEvents, track, useAnalytics } from '@/lib/analytics';
import {
  AMBITION_OPTIONS,
  LIFE_AREA_OPTIONS,
  PROFILE_OPTIONS,
  STEP_PROGRESS,
} from '@/lib/onboarding/constants';
import {
  getOnboardingInsights,
  getPriorityFeatures,
  getWowActionCards,
} from '@/lib/onboarding/personalization';
import { saveOnboardingAnswersForUser } from '@/lib/onboarding/answers.service';
import type {
  AmbitionId,
  IncomeAnswer,
  LifeAreaId,
  OnboardingStepId,
  ProfileTagId,
  WowActionId,
} from '@/lib/onboarding/types';
import { colors, radius, spacing } from '@/lib/theme';

const STEPS: OnboardingStepId[] = [
  'name',
  'welcome',
  'profile',
  'life_areas',
  'smart_config',
  'ambition',
  'reveal',
  'wow',
];

function toggleItem<T extends string>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function getFirstName(name: string): string {
  return name.trim().split(' ')[0] || 'Utilizador';
}

export default function OnboardingScreen() {
  const { complete, skip, userId } = useOnboarding();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  // Ensures user is identified for analytics as soon as they enter onboarding
  useAnalytics();

  const hasTrackedStart = useRef(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [welcomeReady, setWelcomeReady] = useState(false);
  const [revealPhase, setRevealPhase] = useState<'loading' | 'summary'>('loading');
  const [selectedWow, setSelectedWow] = useState<WowActionId | null>(null);

  const step = STEPS[stepIndex];
  const showProgress = stepIndex >= STEPS.indexOf('life_areas');
  const progress = STEP_PROGRESS[step] ?? 0;

  const { answers, patch } = useOnboardingAnswersState(profile?.name ?? '');

  useEffect(() => {
    if (profile?.name && !answers.displayName) {
      patch({ displayName: profile.name });
    }
  }, [profile?.name, answers.displayName, patch]);

  const firstName = getFirstName(answers.displayName);

  const welcomeMessages = useMemo(
    () => [
      `Prazer, ${firstName} 👋`,
      'Vou ajudá-lo a organizar o seu dinheiro com clareza e calma.',
      'Mas primeiro preciso de conhecer um pouco melhor a sua realidade.',
    ],
    [firstName],
  );

  const persistAnswers = useCallback(
    async (partial = answers) => {
      if (!userId) return;
      await saveOnboardingAnswersForUser(userId, partial);
    },
    [userId, answers],
  );

  const goNext = useCallback(() => {
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    if (step === 'reveal') {
      setRevealPhase('loading');
    }
    setStepIndex((index) => Math.max(index - 1, 0));
  }, [step]);

  useEffect(() => {
    if (step !== 'reveal') return;

    setRevealPhase('loading');
    const timer = setTimeout(() => {
      setRevealPhase('summary');
    }, 2400);

    return () => clearTimeout(timer);
  }, [step]);

  async function handleNameContinue() {
    const name = answers.displayName.trim();
    if (!name) return;

    if (profile && name !== profile.name) {
      try {
        await updateProfile.mutateAsync({ name });
      } catch {
        // Continua mesmo se o perfil remoto falhar — nome fica nas respostas
      }
    }

    await persistAnswers({ ...answers, displayName: name });
    goNext();
  }

  async function handleProfileContinue() {
    if (answers.profileTags.length === 0) return;
    await persistAnswers();
    goNext();
  }

  async function handleLifeAreasContinue() {
    if (answers.lifeAreas.length === 0) return;
    await persistAnswers();
    goNext();
  }

  async function handleSmartConfigContinue() {
    const debtOk = skipDebtQuestion || answers.hasDebt !== null;
    if (answers.hasMonthlyIncome === null || answers.hasSavings === null || !debtOk) {
      return;
    }

    const payload = skipDebtQuestion
      ? { ...answers, hasDebt: false }
      : answers;

    await persistAnswers(payload);
    if (skipDebtQuestion) patch({ hasDebt: false });
    goNext();
  }

  async function handleAmbitionContinue() {
    const hasAmbition =
      answers.ambitions.some((item) => item !== 'other') ||
      (answers.ambitions.includes('other') && answers.ambitionOther.trim().length > 0);
    if (!hasAmbition) return;
    await persistAnswers();
    goNext();
  }

  async function handleRevealContinue() {
    await persistAnswers();
    goNext();
  }

  async function handleWowFinish(action: WowActionId) {
    const finalAnswers = {
      ...answers,
      firstAction: action,
      completed: true,
      completedAt: new Date().toISOString(),
    };

    await saveOnboardingAnswersForUser(userId!, finalAnswers);
    await complete(finalAnswers);

    // Track successful completion (not skipped)
    track(AnalyticsEvents.ONBOARDING_COMPLETED, {
      skipped: false,
      profile_tags: answers.profileTags,
    });

    const routes: Record<WowActionId, Href> = {
      first_receipt: '/(tabs)/movimentos?action=receipt' as Href,
      first_asset: '/(tabs)/ativos?action=new-asset' as Href,
      first_goal: '/(tabs)/ativos?action=new-goal' as Href,
      first_warranty: '/(tabs)/ativos?action=new-warranty' as Href,
    };

    router.replace(routes[action]);
  }

  function confirmSkip() {
    Alert.alert(
      'Saltar onboarding?',
      'Podes completar mais tarde nas definições. A experiência será menos personalizada.',
      [
        { text: 'Continuar onboarding', style: 'cancel' },
        {
          text: 'Saltar',
          style: 'destructive',
          onPress: () => {
            // Capture step before skipping
            const stepAtSkip = stepIndex;
            void skip().then(() => {
              track(AnalyticsEvents.ONBOARDING_SKIPPED, { step: stepAtSkip });
              router.replace('/(tabs)' as Href);
            });
          },
        },
      ],
    );
  }

  const insights = getOnboardingInsights(answers);
  const features = getPriorityFeatures(answers);
  const wowCards = getWowActionCards(answers);

  const skipDebtQuestion =
    !answers.profileTags.includes('credits_costs') &&
    !answers.lifeAreas.includes('credits');

  // Fire onboarding_started exactly once when the user lands on the flow
  useEffect(() => {
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true;
      track(AnalyticsEvents.ONBOARDING_STARTED);
    }
  }, []);

  function renderStep() {
    switch (step) {
      case 'name':
        return (
          <Animated.View entering={FadeIn.duration(300)} style={styles.step}>
            <Text variant="h1" style={styles.question}>
              Como gostaria de ser tratado?
            </Text>
            <Text variant="body" color="textSecondary" style={styles.lead}>
              Usamos o seu nome para personalizar a experiência — nada de formalidades
              desnecessárias.
            </Text>
            <TextField
              label="O seu nome"
              value={answers.displayName}
              onChangeText={(value) => patch({ displayName: value })}
              placeholder="Ex: Emanuel"
              autoCapitalize="words"
              autoFocus
            />
          </Animated.View>
        );

      case 'welcome':
        return (
          <Animated.View entering={FadeIn.duration(300)} style={styles.step}>
            <AnimatedAssistantMessage
              messages={welcomeMessages}
              onComplete={() => setWelcomeReady(true)}
            />
          </Animated.View>
        );

      case 'profile':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollStep}>
            <Text variant="h2" style={styles.question}>
              Qual destas frases o descreve melhor?
            </Text>
            <Text variant="body" color="textSecondary" style={styles.lead}>
              Pode escolher mais do que uma — isto ajuda-nos a priorizar o que importa
              para si.
            </Text>
            <View style={styles.cardList}>
              {PROFILE_OPTIONS.map((option, index) => (
                <SelectableCard
                  key={option.id}
                  emoji={option.emoji}
                  label={option.label}
                  selected={answers.profileTags.includes(option.id)}
                  index={index}
                  onPress={() =>
                    patch({
                      profileTags: toggleItem(answers.profileTags, option.id),
                    })
                  }
                />
              ))}
            </View>
          </ScrollView>
        );

      case 'life_areas':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollStep}>
            <Text variant="h2" style={styles.question}>
              {firstName}, quais destas áreas fazem parte da sua vida actualmente?
            </Text>
            <Text variant="body" color="textSecondary" style={styles.lead}>
              Seleccione tudo o que se aplica — usamos isto para mostrar as secções mais
              relevantes.
            </Text>
            <View style={styles.cardList}>
              {LIFE_AREA_OPTIONS.map((option, index) => (
                <SelectableCard
                  key={option.id}
                  emoji={option.emoji}
                  label={option.label}
                  selected={answers.lifeAreas.includes(option.id)}
                  index={index}
                  onPress={() =>
                    patch({
                      lifeAreas: toggleItem(answers.lifeAreas, option.id),
                    })
                  }
                />
              ))}
            </View>
          </ScrollView>
        );

      case 'smart_config':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollStep}>
            <Text variant="h2" style={styles.question}>
              Só o essencial
            </Text>
            <Text variant="body" color="textSecondary" style={styles.lead}>
              Três perguntas rápidas para calibrar a sua experiência — sem formulários
              longos.
            </Text>

            <SmartQuestion
              label="Tem rendimento mensal?"
              value={answers.hasMonthlyIncome}
              options={[
                { key: 'yes', label: 'Sim' },
                { key: 'no', label: 'Não' },
                { key: 'prefer_not', label: 'Prefiro não responder' },
              ]}
              onChange={(value) => patch({ hasMonthlyIncome: value as IncomeAnswer })}
            />

            <SmartQuestion
              label="Tem poupanças actualmente?"
              value={answers.hasSavings}
              options={[
                { key: true, label: 'Sim' },
                { key: false, label: 'Não' },
              ]}
              onChange={(value) => patch({ hasSavings: value as boolean })}
            />

            {!skipDebtQuestion ? (
              <SmartQuestion
                label="Tem créditos ou dívidas?"
                value={answers.hasDebt}
                options={[
                  { key: true, label: 'Sim' },
                  { key: false, label: 'Não' },
                ]}
                onChange={(value) => patch({ hasDebt: value as boolean })}
              />
            ) : (
              <Card variant="outlined" style={styles.hintCard}>
                <Text variant="caption" color="textMuted">
                  Como não indicou créditos, omitimos perguntas sobre dívidas por agora.
                </Text>
              </Card>
            )}
          </ScrollView>
        );

      case 'ambition':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollStep}>
            <Text variant="h2" style={styles.question}>
              O que gostaria que fosse diferente daqui a 12 meses?
            </Text>
            <Text variant="body" color="textSecondary" style={styles.lead}>
              Escolha uma ou mais ambições — isto orienta as sugestões no seu painel.
            </Text>
            <View style={styles.cardList}>
              {AMBITION_OPTIONS.map((option, index) => (
                <SelectableCard
                  key={option.id}
                  emoji={option.emoji}
                  label={option.label}
                  selected={answers.ambitions.includes(option.id)}
                  index={index}
                  onPress={() =>
                    patch({
                      ambitions: toggleItem(answers.ambitions, option.id as AmbitionId),
                    })
                  }
                />
              ))}
            </View>
            {answers.ambitions.includes('other') ? (
              <TextField
                label="Descreva a sua ambição"
                value={answers.ambitionOther}
                onChangeText={(value) => patch({ ambitionOther: value })}
                placeholder="Ex: Criar um fundo de emergência"
              />
            ) : null}
          </ScrollView>
        );

      case 'reveal':
        if (revealPhase === 'loading') {
          return (
            <View style={styles.revealCenter}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text variant="h3" style={styles.revealTitle}>
                A analisar o seu perfil...
              </Text>
              <Text variant="body" color="textSecondary" align="center">
                Estamos a preparar uma experiência à sua medida.
              </Text>
            </View>
          );
        }

        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollStep}>
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text variant="h1" style={styles.question}>
                Olá {firstName} 👋
              </Text>
              <Text variant="body" color="textSecondary" style={styles.lead}>
                Com base nas suas respostas:
              </Text>
            </Animated.View>

            <Card variant="outlined" style={styles.insightsCard}>
              {insights.map((insight, index) => (
                <View key={insight} style={styles.insightRow}>
                  <Text variant="bodyMedium" color="success">
                    ✓
                  </Text>
                  <Text variant="body" color="textSecondary" style={styles.insightText}>
                    {insight}
                  </Text>
                </View>
              ))}
            </Card>

            <Text variant="bodyMedium" style={styles.personalizedLine}>
              A sua experiência CentFlow foi personalizada.
            </Text>

            <Text variant="caption" color="textMuted" style={styles.featuresTitle}>
              Funcionalidades prioritárias activadas:
            </Text>
            <View style={styles.featureGrid}>
              {features.map((feature) => (
                <View key={feature.label} style={styles.featureChip}>
                  <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                  <Text variant="caption" color="textSecondary">
                    {feature.label}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        );

      case 'wow':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollStep}>
            <Text variant="h2" style={styles.question}>
              Qual queres adicionar primeiro?
            </Text>
            <Text variant="body" color="textSecondary" style={styles.lead}>
              Escolhe um primeiro passo concreto — nós guiamo-te a partir daí.
            </Text>
            <View style={styles.cardList}>
              {wowCards.map((card, index) => (
                <Animated.View key={card.id} entering={FadeInDown.delay(index * 60)}>
                  <Pressable
                    onPress={() => setSelectedWow(card.id)}
                    style={({ pressed }) => [
                      styles.wowCard,
                      selectedWow === card.id && styles.wowCardSelected,
                      pressed && styles.wowCardPressed,
                    ]}>
                    <Text style={styles.wowEmoji}>{card.emoji}</Text>
                    <View style={styles.wowText}>
                      <Text variant="bodyMedium" style={styles.wowTitle}>
                        {card.title}
                      </Text>
                      <Text variant="caption" color="textMuted">
                        {card.subtitle}
                      </Text>
                    </View>
                    <SymbolView
                      name={{ ios: 'arrow.right.circle.fill', android: 'arrow_forward', web: 'arrow_forward' }}
                      tintColor={selectedWow === card.id ? colors.primary : colors.textMuted}
                      size={24}
                    />
                  </Pressable>
                </Animated.View>
              ))}
            </View>
            {selectedWow ? (
              <Animated.View entering={FadeIn.duration(300)}>
                <Card variant="outlined" style={styles.encourageCard}>
                  <Text variant="body" color="textSecondary">
                    Excelente escolha, {firstName}! Vamos começar pelo que mais importa
                    para ti.
                  </Text>
                </Card>
              </Animated.View>
            ) : null}
          </ScrollView>
        );

      default:
        return null;
    }
  }

  function renderFooter() {
    switch (step) {
      case 'name':
        return (
          <Button
            label="Continuar"
            onPress={() => void handleNameContinue()}
            disabled={!answers.displayName.trim()}
            loading={updateProfile.isPending}
            fullWidth
            size="lg"
          />
        );

      case 'welcome':
        return (
          <Button
            label="Continuar"
            onPress={goNext}
            disabled={!welcomeReady}
            fullWidth
            size="lg"
          />
        );

      case 'profile':
        return (
          <Button
            label="Continuar"
            onPress={() => void handleProfileContinue()}
            disabled={answers.profileTags.length === 0}
            fullWidth
            size="lg"
          />
        );

      case 'life_areas':
        return (
          <Button
            label="Continuar"
            onPress={() => void handleLifeAreasContinue()}
            disabled={answers.lifeAreas.length === 0}
            fullWidth
            size="lg"
          />
        );

      case 'smart_config':
        return (
          <Button
            label="Continuar"
            onPress={() => void handleSmartConfigContinue()}
            disabled={
              answers.hasMonthlyIncome === null ||
              answers.hasSavings === null ||
              (skipDebtQuestion ? false : answers.hasDebt === null)
            }
            fullWidth
            size="lg"
          />
        );

      case 'ambition':
        return (
          <Button
            label="Continuar"
            onPress={() => void handleAmbitionContinue()}
            disabled={
              answers.ambitions.some((item) => item !== 'other') ||
              (answers.ambitions.includes('other') && answers.ambitionOther.trim().length > 0)
                ? false
                : true
            }
            fullWidth
            size="lg"
          />
        );

      case 'reveal':
        return revealPhase === 'summary' ? (
          <Button
            label="Ver o meu espaço"
            onPress={() => void handleRevealContinue()}
            fullWidth
            size="lg"
          />
        ) : null;

      case 'wow':
        return selectedWow ? (
          <Button
            label="Vamos a isso"
            onPress={() => void handleWowFinish(selectedWow)}
            variant="success"
            fullWidth
            size="lg"
          />
        ) : null;

      default:
        return null;
    }
  }

  return (
    <OnboardingShell
      showBack={stepIndex > 0 && step !== 'reveal'}
      onBack={goBack}
      onSkip={step !== 'wow' ? confirmSkip : undefined}
      showProgress={showProgress}
      progress={progress}
      footer={renderFooter()}>
      {renderStep()}
    </OnboardingShell>
  );
}

function SmartQuestion<T extends string | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { key: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.smartQuestion}>
      <Text variant="bodyMedium" style={styles.smartLabel}>
        {label}
      </Text>
      <View style={styles.smartOptions}>
        {options.map((option) => {
          const selected = value === option.key;
          return (
            <Pressable
              key={String(option.key)}
              onPress={() => onChange(option.key)}
              style={[styles.smartChip, selected && styles.smartChipSelected]}>
              <Text
                variant="caption"
                color={selected ? 'text' : 'textMuted'}
                style={selected ? styles.smartChipTextSelected : undefined}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    flex: 1,
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  scrollStep: {
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  question: {
    lineHeight: 34,
  },
  lead: {
    lineHeight: 24,
  },
  cardList: {
    gap: spacing.md,
  },
  hintCard: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  smartQuestion: {
    gap: spacing.sm,
  },
  smartLabel: {
    fontWeight: '600',
  },
  smartOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  smartChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  smartChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  smartChipTextSelected: {
    fontWeight: '600',
  },
  revealCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  revealTitle: {
    textAlign: 'center',
  },
  insightsCard: {
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  insightText: {
    flex: 1,
    lineHeight: 22,
  },
  personalizedLine: {
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  featuresTitle: {
    textAlign: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  featureEmoji: {
    fontSize: 16,
  },
  wowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  wowCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  wowCardPressed: {
    opacity: 0.9,
  },
  wowEmoji: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  wowText: {
    flex: 1,
    gap: 2,
  },
  wowTitle: {
    fontWeight: '600',
  },
  encourageCard: {
    borderColor: colors.primaryMuted,
    backgroundColor: colors.backgroundElevated,
  },
});
