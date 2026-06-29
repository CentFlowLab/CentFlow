import type { OnboardingStepId, PrimaryObjectiveId } from './types';

/**
 * Copy premium centralizada do onboarding — separada do ecrã para ser testável
 * e fácil de afinar. Cada pergunta tem uma razão ("porquê") e o que desbloqueia.
 */

export type StepReason = {
  /** Porque estamos a perguntar (transparência). */
  why: string;
  /** O que esta resposta desbloqueia / melhora. */
  unlocks: string;
};

/** Passos que contam para o contador "Passo X de Y" (perguntas reais). */
export const QUESTION_STEPS: OnboardingStepId[] = [
  'primary_objective',
  'profile',
  'name',
  'life_areas',
  'ambition',
  'smart_config',
];

export const STEP_REASONS: Partial<Record<OnboardingStepId, StepReason>> = {
  primary_objective: {
    why: 'Para focar a CentFlow no que mais te importa agora.',
    unlocks: 'Ativa as áreas e sugestões certas para ti.',
  },
  profile: {
    why: 'Cada pessoa parte de um ponto diferente — sem julgamentos.',
    unlocks: 'Adapta as prioridades ao teu momento.',
  },
  name: {
    why: 'Para falarmos contigo de forma pessoal, não genérica.',
    unlocks: 'Mensagens e dicas tratadas por ti.',
  },
  life_areas: {
    why: 'Mostramos primeiro o que faz parte da tua vida real.',
    unlocks: 'Organiza o painel à volta do que usas.',
  },
  ambition: {
    why: 'Saber para onde vais ajuda-nos a guiar-te até lá.',
    unlocks: 'Sugestões orientadas aos teus próximos 12 meses.',
  },
  smart_config: {
    why: 'Quanto mais soubermos, mais preciso fica o teu plano.',
    unlocks: 'Estimativas e recomendações mais afinadas.',
  },
};

/** Recompensa/afirmação imediata após escolher o objetivo principal. */
export const PRIMARY_OBJECTIVE_REWARD: Record<PrimaryObjectiveId, string> = {
  control_spending: 'Boa — vamos dar-te clareza total sobre onde vai o dinheiro.',
  save_more: 'Excelente — vamos tornar a poupança num hábito visível.',
  track_wealth: 'Perfeito — vais ver o teu património num só lugar.',
  receipts_warranties: 'Ótimo — nunca mais vais perder um talão ou garantia.',
  subscriptions: 'Boa escolha — vamos travar os custos que passam despercebidos.',
  organize_credits: 'Certo — vamos pôr os teus créditos e custos sob controlo.',
};

export function getStepLabel(step: OnboardingStepId): string | undefined {
  const index = QUESTION_STEPS.indexOf(step);
  if (index === -1) return undefined;
  return `Passo ${index + 1} de ${QUESTION_STEPS.length}`;
}

export function getProgressLabel(progress: number): string {
  if (progress >= 90) return 'A finalizar o teu plano';
  if (progress >= 68) return 'A ativar as funcionalidades certas';
  if (progress >= 40) return 'A personalizar a tua experiência';
  return 'A criar o teu espaço financeiro';
}

/** Etapas do loading "a IA cria o plano" (sensação de valor, não instantâneo). */
export const PLAN_LOADING_STAGES: string[] = [
  'A analisar as tuas respostas',
  'A ativar as funcionalidades certas',
  'A preparar o teu plano',
];
