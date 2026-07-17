import { type Href, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingIllustration, OnboardingShell } from '@/components/onboarding';
import {
  BigAmountInput,
  BuildSequence,
  ChoiceCard,
  ChoiceList,
  PlanResult,
  PremiumHeader,
  WheelPicker,
  type BuildStep,
  type WheelItem,
} from '@/components/onboarding/premium';
import { Button, Text } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { useOnboarding, useOnboardingAnswersState } from '@/hooks/useOnboarding';
import { enrichOnboardingAnswers } from '@/lib/onboarding/features';
import { getSpendAwarenessRevealMessage } from '@/lib/onboarding/assistance';
import { resolveFirstAction } from '@/lib/onboarding/first-action';
import {
  fetchOnboardingAnswers,
  saveOnboardingAnswersForUser,
} from '@/lib/onboarding/answers.service';
import {
  BUILD_STEPS,
  HISTORY_OPTIONS,
  OBJECTIVE_OPTIONS,
  ONBOARDING_CREDIT_OPTIONS,
  ONBOARDING_INVESTMENT_OPTIONS,
  PROBLEM_OPTIONS,
  RESULT_CARDS,
  SECURITY_ITEMS,
  type ObjectiveOption,
} from '@/lib/onboarding/premium-constants';
import type {
  FinancialHistoryId,
  LifeAreaId,
  OnboardingAnswers,
  OnboardingCreditId,
  OnboardingInvestmentId,
  ProfileTagId,
  SpendAwarenessId,
} from '@/lib/onboarding/types';
import { colors, radius, spacing } from '@/lib/theme';

type StepId =
  | 'welcome'
  | 'curiosity'
  | 'problem'
  | 'objective'
  | 'history'
  | 'goal'
  | 'timeline'
  | 'income'
  | 'plan'
  | 'ai'
  | 'ocr'
  | 'credits'
  | 'investments'
  | 'security'
  | 'build'
  | 'result'
  | 'first_run';

const STEPS: StepId[] = [
  'welcome',
  'curiosity',
  'problem',
  'objective',
  'history',
  'goal',
  'timeline',
  'income',
  'plan',
  'ai',
  'ocr',
  'credits',
  'investments',
  'security',
  'build',
  'result',
  'first_run',
];

const PROGRESS_FROM = 1;
const PROGRESS_TO = 13;

const YEAR_ITEMS: WheelItem[] = Array.from({ length: 11 }, (_, i) => ({
  value: i,
  label: String(i),
}));
const MONTH_ITEMS: WheelItem[] = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: String(i),
}));

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

function getFirstName(name: string): string {
  return name.trim().split(' ')[0] || '';
}

function firstRunMessage(answers: OnboardingAnswers): string {
  let focus =
    'o maior impacto para ti será controlar melhor as despesas variáveis e acompanhar o teu património líquido.';

  if (answers.creditTypes.length > 0 || answers.primaryObjective === 'organize_credits') {
    focus =
      'o maior impacto para ti será ganhar visibilidade sobre os créditos e os custos fixos do mês.';
  } else if (answers.primaryObjective === 'save_more') {
    focus =
      'o maior impacto para ti será transformar o teu objetivo de poupança num plano que acompanhas todos os meses.';
  } else if (answers.primaryObjective === 'track_wealth') {
    focus =
      'o maior impacto para ti será reunir bens, contas e objetivos para veres o teu património com clareza.';
  }

  return `Com base nas tuas respostas, ${focus}`;
}

export default function OnboardingScreen() {
  const { complete, userId } = useOnboarding();
  const { data: profile } = useProfile();

  const [stepIndex, setStepIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const { answers, patch, setAnswers } = useOnboardingAnswersState();

  const step = STEPS[stepIndex];
  const firstName = getFirstName(answers.displayName || profile?.name || '');

  // Prefill a partir do perfil + respostas guardadas (sessão já existe).
  useEffect(() => {
    if (profile?.name && !answers.displayName) {
      patch({ displayName: profile.name });
    }
  }, [answers.displayName, patch, profile?.name]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const saved = await fetchOnboardingAnswers(userId);
      if (cancelled || saved.completed) return;
      setAnswers((current) => ({
        ...saved,
        displayName: current.displayName || saved.displayName || profile?.name || '',
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.name, setAnswers, userId]);

  const persistAnswers = useCallback(
    async (partial: OnboardingAnswers = answers) => {
      if (!userId) return;
      await saveOnboardingAnswersForUser(userId, enrichOnboardingAnswers(partial));
    },
    [answers, userId],
  );

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, []);
  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Timeline (anos + meses)
  const totalMonths = answers.savingsMonths ?? 12;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const setTimeline = useCallback(
    (y: number, m: number) => {
      patch({ savingsMonths: Math.max(1, y * 12 + m) });
    },
    [patch],
  );

  function selectObjective(option: ObjectiveOption) {
    patch({
      primaryObjective: option.primary,
      ambitions: [option.ambition],
    });
  }

  function toggleInvestment(id: OnboardingInvestmentId) {
    if (id === 'none') {
      patch({ investmentTypes: ['none'] });
      return;
    }
    const next = toggle(answers.investmentTypes.filter((i) => i !== 'none'), id);
    patch({ investmentTypes: next });
  }

  const buildSteps = useMemo<BuildStep[]>(
    () =>
      BUILD_STEPS.map((s) => ({
        id: s.id,
        label: s.label,
        task: s.id === 'sync' ? () => persistAnswers() : undefined,
      })),
    [persistAnswers],
  );

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);

    const lifeAreas = new Set<LifeAreaId>(answers.lifeAreas);
    if (answers.creditTypes.length > 0) lifeAreas.add('credits');
    if (answers.investmentTypes.some((i) => i !== 'none')) lifeAreas.add('investments');
    if ((answers.savingsGoal ?? 0) > 0) lifeAreas.add('savings_goals');

    const final = enrichOnboardingAnswers({
      ...answers,
      lifeAreas: Array.from(lifeAreas),
      hasDebt: answers.creditTypes.length > 0,
      hasSavings: (answers.savingsGoal ?? 0) > 0 ? true : answers.hasSavings,
      hasMonthlyIncome: (answers.monthlyIncome ?? 0) > 0 ? 'yes' : answers.hasMonthlyIncome,
      firstAction: resolveFirstAction(answers),
      completed: true,
      skipped: false,
      completedAt: new Date().toISOString(),
    });

    if (userId) {
      await saveOnboardingAnswersForUser(userId, final);
      await complete(final);
    }
    router.replace('/(tabs)/' as Href);
  }

  const progress = useMemo(() => {
    const clamped = Math.min(PROGRESS_TO, Math.max(PROGRESS_FROM, stepIndex));
    return Math.round(((clamped - PROGRESS_FROM) / (PROGRESS_TO - PROGRESS_FROM)) * 100);
  }, [stepIndex]);

  const showProgress = stepIndex >= PROGRESS_FROM && stepIndex <= PROGRESS_TO;
  const showBack =
    stepIndex > 0 && step !== 'build' && step !== 'first_run' && !finishing;

  return (
    <OnboardingShell
      showBack={showBack}
      onBack={goBack}
      showProgress={showProgress}
      progress={progress}
      progressLabel="A preparar o teu plano"
      footer={renderFooter()}>
      <Animated.View key={step} entering={FadeIn.duration(260)} style={styles.stepRoot}>
        {renderStep()}
      </Animated.View>
    </OnboardingShell>
  );

  function renderStep() {
    switch (step) {
      case 'welcome':
        return (
          <Hero
            emoji="🪙"
            title="A tua vida financeira, finalmente organizada."
            subtitle="Bem-vindo à CentFlow — o teu copiloto financeiro premium."
          />
        );

      case 'curiosity':
        return (
          <View style={styles.centeredStep}>
            <PremiumHeader
              eyebrow="Uma pergunta rápida"
              title="Sabes exatamente quanto podes gastar hoje sem comprometer o resto do mês?"
            />
            <ChoiceList>
              {(['yes', 'no'] as SpendAwarenessId[]).map((id, index) => (
                <ChoiceCard
                  key={id}
                  label={id === 'yes' ? 'Sim' : 'Não'}
                  selected={answers.spendAwareness === id}
                  index={index}
                  onPress={() => patch({ spendAwareness: id })}
                />
              ))}
            </ChoiceList>
            {answers.spendAwareness ? (
              <Animated.View entering={FadeIn.duration(320)}>
                <Text variant="h3" color="primary" align="center" style={styles.revealLine}>
                  {getSpendAwarenessRevealMessage(answers.spendAwareness)}
                </Text>
              </Animated.View>
            ) : null}
          </View>
        );

      case 'problem':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <PremiumHeader
              eyebrow="O que acontece contigo?"
              title="Escolhe tudo o que sentes."
              lead="Podes escolher várias opções."
            />
            <ChoiceList>
              {PROBLEM_OPTIONS.map((option, index) => (
                <ChoiceCard
                  key={option.id}
                  emoji={option.emoji}
                  label={option.label}
                  selected={answers.profileTags.includes(option.id)}
                  index={index}
                  compact
                  selectionMode="multiple"
                  onPress={() =>
                    patch({ profileTags: toggle(answers.profileTags, option.id as ProfileTagId) })
                  }
                />
              ))}
            </ChoiceList>
          </ScrollView>
        );

      case 'objective':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <PremiumHeader eyebrow="Objetivo principal" title="Qual é o teu maior objetivo?" />
            <ChoiceList>
              {OBJECTIVE_OPTIONS.map((option, index) => {
                const selected =
                  answers.primaryObjective === option.primary &&
                  answers.ambitions.includes(option.ambition);
                return (
                  <ChoiceCard
                    key={option.id}
                    emoji={option.emoji}
                    label={option.label}
                    selected={selected}
                    index={index}
                    compact
                    onPress={() => selectObjective(option)}
                  />
                );
              })}
            </ChoiceList>
          </ScrollView>
        );

      case 'history':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <PremiumHeader
              eyebrow="Histórico"
              title="Já usaste alguma aplicação financeira?"
            />
            <ChoiceList>
              {HISTORY_OPTIONS.map((option, index) => (
                <ChoiceCard
                  key={option.id}
                  emoji={option.emoji}
                  label={option.label}
                  selected={answers.financialHistory === option.id}
                  index={index}
                  compact
                  onPress={() =>
                    patch({ financialHistory: option.id as FinancialHistoryId })
                  }
                />
              ))}
            </ChoiceList>
          </ScrollView>
        );

      case 'goal':
        return (
          <View style={styles.centeredStep}>
            <PremiumHeader
              eyebrow="Objetivo de poupança"
              title="Quanto gostarias de poupar?"
              align="center"
            />
            <View style={styles.amountWrap}>
              <BigAmountInput
                value={answers.savingsGoal}
                onChange={(value) => patch({ savingsGoal: value })}
              />
            </View>
          </View>
        );

      case 'timeline':
        return (
          <View style={styles.centeredStep}>
            <PremiumHeader eyebrow="Prazo" title="Em quanto tempo?" align="center" />
            <View style={styles.wheelsRow}>
              <View style={styles.wheelCol}>
                <WheelPicker
                  data={YEAR_ITEMS}
                  value={years}
                  onChange={(y) => setTimeline(y, months)}
                  width={120}
                />
                <Text variant="caption" color="textMuted">
                  anos
                </Text>
              </View>
              <View style={styles.wheelCol}>
                <WheelPicker
                  data={MONTH_ITEMS}
                  value={months}
                  onChange={(m) => setTimeline(years, m)}
                  width={120}
                />
                <Text variant="caption" color="textMuted">
                  meses
                </Text>
              </View>
            </View>
            <Text variant="bodyMedium" color="primary" align="center">
              ≈ {totalMonths} {totalMonths === 1 ? 'mês' : 'meses'}
            </Text>
          </View>
        );

      case 'income':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.incomeStep}>
            <PremiumHeader
              eyebrow="Rendimento"
              title="Quanto recebes por mês?"
              align="center"
            />
            <View style={styles.amountWrap}>
              <BigAmountInput
                value={answers.monthlyIncome}
                onChange={(value) => patch({ monthlyIncome: value })}
              />
            </View>
            <View style={styles.privacyNotes}>
              <PrivacyNote
                text="Isto nunca ficará público."
                name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
              />
              <PrivacyNote
                text="Podes alterar mais tarde."
                name={{ ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' }}
              />
            </View>
          </ScrollView>
        );

      case 'plan':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <PremiumHeader
              eyebrow="O teu plano"
              title="Feito à tua medida."
              align="center"
            />
            <PlanResult
              savingsGoal={answers.savingsGoal ?? 0}
              months={totalMonths}
              monthlyIncome={answers.monthlyIncome}
              firstName={firstName}
            />
          </ScrollView>
        );

      case 'ai':
        return (
          <Hero
            emoji="🤖"
            title="Análises quando há dados suficientes."
            subtitle="A CentFlow analisa os teus padrões e apresenta sugestões — nunca decide por ti."
          />
        );

      case 'ocr':
        return (
          <Hero
            emoji="🧾"
            title="Despesas em segundos."
            subtitle="Digitaliza um talão para preencher os dados mais rapidamente. Revês, editas e confirmas antes de guardar."
          />
        );

      case 'credits':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <PremiumHeader
              eyebrow="Créditos (opcional)"
              title="Tens algum destes créditos?"
              lead="Podes escolher várias opções."
            />
            <ChoiceList>
              {ONBOARDING_CREDIT_OPTIONS.map((option, index) => (
                <ChoiceCard
                  key={option.id}
                  emoji={option.emoji}
                  label={option.label}
                  selected={answers.creditTypes.includes(option.id)}
                  index={index}
                  compact
                  selectionMode="multiple"
                  onPress={() =>
                    patch({ creditTypes: toggle(answers.creditTypes, option.id as OnboardingCreditId) })
                  }
                />
              ))}
            </ChoiceList>
          </ScrollView>
        );

      case 'investments':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <PremiumHeader
              eyebrow="Investimentos"
              title="Onde investes?"
              lead="Podes escolher várias opções."
            />
            <ChoiceList>
              {ONBOARDING_INVESTMENT_OPTIONS.map((option, index) => (
                <ChoiceCard
                  key={option.id}
                  emoji={option.emoji}
                  label={option.label}
                  selected={answers.investmentTypes.includes(option.id)}
                  index={index}
                  compact
                  selectionMode="multiple"
                  onPress={() => toggleInvestment(option.id as OnboardingInvestmentId)}
                />
              ))}
            </ChoiceList>
          </ScrollView>
        );

      case 'security':
        return (
          <View style={styles.centeredStep}>
            <Hero
              emoji="🔐"
              title="Os teus dados, protegidos."
              subtitle="Protegidos em trânsito e em repouso, sincronizados com a tua conta."
            />
            <View style={styles.securityList}>
              {SECURITY_ITEMS.map((item, index) => (
                <Animated.View
                  key={item.title}
                  entering={FadeInDown.duration(360).delay(index * 90)}
                  style={styles.securityRow}>
                  <Text style={styles.securityEmoji}>{item.emoji}</Text>
                  <View style={styles.securityText}>
                    <Text variant="bodyMedium">{item.title}</Text>
                    <Text variant="caption" color="textMuted">
                      {item.description}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        );

      case 'build':
        return (
          <View style={styles.centeredStep}>
            <PremiumHeader
              title="Estamos a preparar o teu espaço."
              align="center"
            />
            <BuildSequence steps={buildSteps} onComplete={goNext} />
          </View>
        );

      case 'result':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <PremiumHeader
              eyebrow="Tudo pronto"
              title="O teu plano financeiro está pronto."
            />
            <View style={styles.resultList}>
              {RESULT_CARDS.map((card, index) => (
                <Animated.View
                  key={card.label}
                  entering={FadeInDown.duration(340).delay(index * 70)}
                  style={styles.resultRow}>
                  <View style={styles.resultCheck}>
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      tintColor={colors.success}
                      size={16}
                    />
                  </View>
                  <Text style={styles.resultEmoji}>{card.emoji}</Text>
                  <Text variant="bodyMedium" style={styles.resultLabel}>
                    {card.label}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </ScrollView>
        );

      case 'first_run':
        return (
          <View style={styles.centeredStep}>
            <Animated.View entering={FadeIn.duration(500)} style={styles.aiBubble}>
              <OnboardingIllustration emoji="👋" size={104} />
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(500).delay(200)}>
              <Text variant="display" align="center" style={styles.firstRunTitle}>
                {firstName ? `Olá, ${firstName}.` : 'Olá.'}
              </Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(500).delay(400)}>
              <Text variant="body" color="textSecondary" align="center" style={styles.firstRunBody}>
                {firstRunMessage(answers)}
              </Text>
            </Animated.View>
            <Animated.View entering={FadeIn.duration(500).delay(700)}>
              <Text variant="caption" color="textMuted" align="center">
                O teu primeiro passo demora menos de um minuto.
              </Text>
            </Animated.View>
          </View>
        );

      default:
        return null;
    }
  }

  function renderFooter() {
    switch (step) {
      case 'welcome':
        return <Button label="Começar" onPress={goNext} fullWidth size="lg" />;
      case 'curiosity':
        return (
          <Button
            label="Continuar"
            onPress={goNext}
            disabled={!answers.spendAwareness}
            fullWidth
            size="lg"
          />
        );
      case 'problem':
        return (
          <Button
            label="Continuar"
            onPress={goNext}
            disabled={answers.profileTags.length === 0}
            fullWidth
            size="lg"
          />
        );
      case 'objective':
        return (
          <Button
            label="Continuar"
            onPress={goNext}
            disabled={!answers.primaryObjective}
            fullWidth
            size="lg"
          />
        );
      case 'history':
        return (
          <Button
            label="Continuar"
            onPress={goNext}
            disabled={!answers.financialHistory}
            fullWidth
            size="lg"
          />
        );
      case 'goal':
        return (
          <Button
            label="Continuar"
            onPress={goNext}
            disabled={(answers.savingsGoal ?? 0) <= 0}
            fullWidth
            size="lg"
          />
        );
      case 'timeline':
        return <Button label="Continuar" onPress={goNext} fullWidth size="lg" />;
      case 'income':
        return (
          <Button
            label="Continuar"
            onPress={goNext}
            disabled={(answers.monthlyIncome ?? 0) <= 0}
            fullWidth
            size="lg"
          />
        );
      case 'plan':
        return <Button label="Continuar" onPress={goNext} fullWidth size="lg" />;
      case 'ai':
      case 'ocr':
        return <Button label="Continuar" onPress={goNext} fullWidth size="lg" />;
      case 'credits':
        return (
          <Button
            label={answers.creditTypes.length > 0 ? 'Continuar' : 'Saltar'}
            onPress={goNext}
            variant={answers.creditTypes.length > 0 ? 'primary' : 'secondary'}
            fullWidth
            size="lg"
          />
        );
      case 'investments':
        return (
          <Button
            label={answers.investmentTypes.length > 0 ? 'Continuar' : 'Saltar'}
            onPress={goNext}
            variant={answers.investmentTypes.length > 0 ? 'primary' : 'secondary'}
            fullWidth
            size="lg"
          />
        );
      case 'security':
        return <Button label="Continuar" onPress={goNext} fullWidth size="lg" />;
      case 'build':
        return null;
      case 'result':
        return <Button label="Continuar" onPress={goNext} fullWidth size="lg" />;
      case 'first_run':
        return (
          <Button
            label="Começar"
            onPress={() => void handleFinish()}
            variant="success"
            loading={finishing}
            fullWidth
            size="lg"
          />
        );
      default:
        return null;
    }
  }
}

function Hero({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.hero}>
      <Animated.View entering={FadeIn.duration(600)}>
        <LinearGradient
          colors={[colors.primaryMuted, 'transparent'] as const}
          style={styles.heroGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}>
          <OnboardingIllustration emoji={emoji} size={132} />
        </LinearGradient>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(520).delay(150)}>
        <Text variant="display" align="center" style={styles.heroTitle}>
          {title}
        </Text>
      </Animated.View>
      {subtitle ? (
        <Animated.View entering={FadeInDown.duration(520).delay(280)}>
          <Text variant="body" color="textSecondary" align="center" style={styles.heroSubtitle}>
            {subtitle}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function PrivacyNote({
  text,
  name,
}: {
  text: string;
  name: React.ComponentProps<typeof SymbolView>['name'];
}) {
  return (
    <View style={styles.privacyNote}>
      <SymbolView name={name} tintColor={colors.textMuted} size={14} />
      <Text variant="caption" color="textMuted">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepRoot: {
    flex: 1,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  centeredStep: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  revealLine: {
    marginTop: spacing.lg,
    lineHeight: 28,
  },
  incomeStep: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  amountWrap: {
    paddingVertical: spacing.xl,
  },
  wheelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  wheelCol: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  privacyNotes: {
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  heroGlow: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    lineHeight: 40,
  },
  heroSubtitle: {
    lineHeight: 23,
    paddingHorizontal: spacing.md,
  },
  securityList: {
    gap: spacing.md,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  securityEmoji: {
    fontSize: 26,
    width: 36,
    textAlign: 'center',
  },
  securityText: {
    flex: 1,
    gap: 2,
  },
  resultList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultCheck: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultEmoji: {
    fontSize: 20,
  },
  resultLabel: {
    flex: 1,
  },
  aiBubble: {
    alignSelf: 'center',
  },
  firstRunTitle: {
    lineHeight: 40,
  },
  firstRunBody: {
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
});
