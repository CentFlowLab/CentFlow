import { type Href, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import {
  FeatureAreaCard,
  OnboardingShell,
  OnboardingStepHeader,
  SelectableCard,
  ValuePromiseSection,
} from '@/components/onboarding';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { useOnboarding, useOnboardingAnswersState } from '@/hooks/useOnboarding';
import { useUpdateProfile } from '@/hooks/mutations/useProfileMutations';
import { AnalyticsEvents, track, useAnalytics } from '@/lib/analytics';
import {
  AMBITION_OPTIONS,
  LIFE_AREA_OPTIONS,
  PRIMARY_OBJECTIVE_OPTIONS,
  PROFILE_OPTIONS,
  STEP_PROGRESS,
} from '@/lib/onboarding/constants';
import {
  enrichOnboardingAnswers,
  getFeatureRevealCards,
  hintsFromPrimaryObjective,
} from '@/lib/onboarding/features';
import {
  getOnboardingInsights,
  getVictoryActionCards,
} from '@/lib/onboarding/personalization';
import { saveOnboardingAnswersForUser, fetchOnboardingAnswers } from '@/lib/onboarding/answers.service';
import type {
  AmbitionId,
  GenderId,
  IncomeAnswer,
  LifeAreaId,
  OnboardingStepId,
  PrimaryObjectiveId,
  ProfileTagId,
  WowActionId,
} from '@/lib/onboarding/types';
import { GENDER_OPTIONS, getValuePromiseMessages } from '@/lib/onboarding/welcome';
import { colors, radius, spacing } from '@/lib/theme';

const STEPS: OnboardingStepId[] = [
  'name',
  'welcome',
  'primary_objective',
  'profile',
  'life_areas',
  'ambition',
  'smart_config',
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
  const { complete, userId } = useOnboarding();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  // Ensures user is identified for analytics as soon as they enter onboarding
  useAnalytics();

  const hasTrackedStart = useRef(false);
  const userEditedName = useRef(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [welcomeReady, setWelcomeReady] = useState(false);
  const [showGenderOptions, setShowGenderOptions] = useState(false);
  const [revealPhase, setRevealPhase] = useState<'loading' | 'summary'>('loading');
  const [selectedWow, setSelectedWow] = useState<WowActionId | null>(null);

  const step = STEPS[stepIndex];
  const showProgress = stepIndex >= STEPS.indexOf('welcome');
  const progress = STEP_PROGRESS[step] ?? 0;
  const progressLabel =
    progress >= 90
      ? 'Quase pronto'
      : progress >= 50
        ? 'A personalizar a tua experiência'
        : 'A criar o teu espaço financeiro';

  const { answers, patch, setAnswers } = useOnboardingAnswersState();

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    void (async () => {
      const saved = await fetchOnboardingAnswers(userId);
      if (cancelled || saved.completed) return;

      setAnswers((current) => ({
        ...saved,
        displayName: current.displayName || saved.displayName || '',
        gender: current.gender ?? saved.gender ?? 'neutral',
        primaryObjective: saved.primaryObjective ?? current.primaryObjective,
        enabledFeatures: saved.enabledFeatures ?? [],
        smartConfigSkipped: saved.smartConfigSkipped ?? false,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [setAnswers, userId]);

  useEffect(() => {
    if (userEditedName.current || answers.displayName.trim()) return;
    if (!profile?.name) return;
    patch({ displayName: profile.name });
  }, [answers.displayName, patch, profile?.name]);

  const firstName = getFirstName(answers.displayName);

  const valuePromiseMessages = useMemo(
    () => getValuePromiseMessages(firstName),
    [firstName],
  );

  const enrichedAnswers = useMemo(() => enrichOnboardingAnswers(answers), [answers]);

  const persistAnswers = useCallback(
    async (partial = answers) => {
      if (!userId) return;
      await saveOnboardingAnswersForUser(userId, enrichOnboardingAnswers(partial));
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
    if (step !== 'welcome') return;

    setWelcomeReady(false);
    const timer = setTimeout(() => setWelcomeReady(true), 3200);
    return () => clearTimeout(timer);
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

    const gender = answers.gender ?? 'neutral';

    if (profile && name !== profile.name) {
      try {
        await updateProfile.mutateAsync({ name });
      } catch {
        // Continua mesmo se o perfil remoto falhar — nome fica nas respostas
      }
    }

    await persistAnswers({ ...answers, displayName: name, gender });
    goNext();
  }

  async function handlePrimaryObjectiveContinue() {
    if (!answers.primaryObjective) return;
    await persistAnswers();
    goNext();
  }

  function handleSelectPrimaryObjective(objective: PrimaryObjectiveId) {
    const hints = hintsFromPrimaryObjective(objective, answers);
    patch({ ...hints, primaryObjective: objective });
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
    if (!answers.smartConfigSkipped) {
      if (answers.hasMonthlyIncome === null || answers.hasSavings === null || !debtOk) {
        return;
      }
    }

    const payload = skipDebtQuestion
      ? { ...answers, hasDebt: answers.smartConfigSkipped ? answers.hasDebt : false }
      : answers;

    await persistAnswers(payload);
    if (skipDebtQuestion && !answers.smartConfigSkipped) patch({ hasDebt: false });
    goNext();
  }

  async function handleSmartConfigSkip() {
    const payload = {
      ...answers,
      smartConfigSkipped: true,
      hasMonthlyIncome: answers.hasMonthlyIncome ?? 'prefer_not',
      hasSavings: answers.hasSavings,
      hasDebt: skipDebtQuestion ? false : answers.hasDebt,
    };
    patch(payload);
    await persistAnswers(payload);
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
    const finalAnswers = enrichOnboardingAnswers({
      ...answers,
      firstAction: action,
      completed: true,
      skipped: false,
      completedAt: new Date().toISOString(),
    });

    await saveOnboardingAnswersForUser(userId!, finalAnswers);
    await complete(finalAnswers);

    track(AnalyticsEvents.ONBOARDING_COMPLETED, {
      skipped: false,
      profile_tags: answers.profileTags,
    });

    router.replace('/(tabs)/' as Href);
  }

  const insights = getOnboardingInsights(enrichedAnswers);
  const featureCards = getFeatureRevealCards(enrichedAnswers);
  const wowCards = getVictoryActionCards(enrichedAnswers);

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
            <OnboardingStepHeader
              title="Vamos criar o teu espaço financeiro"
              lead="Como queres que te chamemos? Usamos o teu nome para personalizar a experiência."
            />
            <TextField
              label="O teu nome"
              value={answers.displayName}
              onChangeText={(value) => {
                userEditedName.current = true;
                patch({ displayName: value });
              }}
              placeholder="Ex: Emanuel"
              autoCapitalize="words"
              autoFocus
            />

            {showGenderOptions ? (
              <View style={styles.genderBlock}>
                <Text variant="bodyMedium" style={styles.smartLabel}>
                  Tratamento preferido
                </Text>
                <View style={styles.smartOptions}>
                  {GENDER_OPTIONS.map((option) => {
                    const selected = (answers.gender ?? 'neutral') === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => patch({ gender: option.id as GenderId })}
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
            ) : (
              <Pressable onPress={() => setShowGenderOptions(true)} hitSlop={8}>
                <Text variant="caption" color="textMuted" style={styles.genderToggle}>
                  Preferes personalizar o tratamento?
                </Text>
              </Pressable>
            )}
          </Animated.View>
        );

      case 'welcome':
        return (
          <Animated.View entering={FadeIn.duration(300)} style={styles.step}>
            <ValuePromiseSection messages={valuePromiseMessages} />
          </Animated.View>
        );

      case 'primary_objective':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollStep}>
            <OnboardingStepHeader
              title="Qual é o teu principal objetivo?"
              lead="Escolhe o foco principal — adaptamos a CentFlow ao que mais importa para ti."
            />
            <View style={styles.cardList}>
              {PRIMARY_OBJECTIVE_OPTIONS.map((option, index) => (
                <SelectableCard
                  key={option.id}
                  emoji={option.emoji}
                  label={option.label}
                  description={option.description}
                  selected={answers.primaryObjective === option.id}
                  index={index}
                  size="large"
                  onPress={() => handleSelectPrimaryObjective(option.id)}
                />
              ))}
            </View>
          </ScrollView>
        );

      case 'profile':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollStep}>
            <OnboardingStepHeader
              title="Ajuda-nos a perceber onde estás agora"
              lead="Escolhe tudo o que se aplica — usamos isto para adaptar a CentFlow ao que realmente precisas."
              context="Podes alterar estas preferências mais tarde."
            />
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
            <OnboardingStepHeader
              title={`${firstName}, o que faz parte da tua vida hoje?`}
              lead="Selecciona as áreas relevantes — mostramos primeiro o que interessa."
            />
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
            <OnboardingStepHeader
              title="Só o essencial"
              lead="Três perguntas rápidas para calibrar a tua experiência."
              context="Isto é opcional — podes alterar ou saltar por agora."
            />

            <SmartQuestion
              label="Tens rendimento mensal?"
              value={answers.hasMonthlyIncome}
              options={[
                { key: 'yes', label: 'Sim' },
                { key: 'no', label: 'Não' },
                { key: 'prefer_not', label: 'Prefiro não dizer' },
              ]}
              onChange={(value) => patch({ hasMonthlyIncome: value as IncomeAnswer })}
            />

            <SmartQuestion
              label="Tens poupanças actualmente?"
              value={answers.hasSavings}
              options={[
                { key: true, label: 'Sim' },
                { key: false, label: 'Não' },
              ]}
              onChange={(value) => patch({ hasSavings: value as boolean })}
            />

            {!skipDebtQuestion ? (
              <SmartQuestion
                label="Tens créditos ou dívidas?"
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
                  Como não indicaste créditos, omitimos perguntas sobre dívidas por agora.
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
            <OnboardingStepHeader
              title="O que queres que seja diferente daqui a 12 meses?"
              lead="Escolhe uma ou mais ambições — orientam as sugestões no teu painel."
            />
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
                label="Descreve a tua ambição"
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
                A criar o teu espaço...
              </Text>
              <Text variant="body" color="textSecondary" align="center">
                Estamos a activar as funcionalidades certas para ti.
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
                O teu espaço está pronto ✨
              </Text>
              <Text variant="body" color="textSecondary" style={styles.lead}>
                Olá {firstName} — com base nas tuas escolhas criámos:
              </Text>
            </Animated.View>

            <Card variant="outlined" style={styles.insightsCard}>
              {insights.map((insight) => (
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
              Funcionalidades activadas
            </Text>

            <View style={styles.featureList}>
              {featureCards.map((feature, index) => (
                <FeatureAreaCard key={feature.id} feature={feature} index={index} />
              ))}
            </View>
          </ScrollView>
        );

      case 'wow':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollStep}>
            <OnboardingStepHeader
              title="Vamos criar a tua primeira vitória"
              lead="Escolhe um primeiro passo concreto — guiamo-te a partir daí."
            />
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
                    Excelente, {firstName}! Este é o caminho certo para começares com
                    impacto.
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
            label="Vamos começar"
            onPress={goNext}
            disabled={!welcomeReady}
            fullWidth
            size="lg"
          />
        );

      case 'primary_objective':
        return (
          <Button
            label="Continuar"
            onPress={() => void handlePrimaryObjectiveContinue()}
            disabled={!answers.primaryObjective}
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
          <View style={styles.footerStack}>
            <Button
              label="Continuar"
              onPress={() => void handleSmartConfigContinue()}
              disabled={
                answers.smartConfigSkipped
                  ? false
                  : answers.hasMonthlyIncome === null ||
                    answers.hasSavings === null ||
                    (skipDebtQuestion ? false : answers.hasDebt === null)
              }
              fullWidth
              size="lg"
            />
            <Button
              label="Saltar por agora"
              variant="ghost"
              onPress={() => void handleSmartConfigSkip()}
              fullWidth
              size="lg"
            />
          </View>
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
      showProgress={showProgress}
      progress={progress}
      progressLabel={progressLabel}
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
  genderBlock: {
    gap: spacing.sm,
  },
  genderToggle: {
    textDecorationLine: 'underline',
  },
  footerStack: {
    gap: spacing.sm,
  },
  featureList: {
    gap: spacing.md,
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
