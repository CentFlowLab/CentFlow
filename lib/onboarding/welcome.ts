import type { GenderId } from './types';

export function getWelcomeMessages(firstName: string, gender: GenderId | null): string[] {
  const helpLine =
    gender === 'female'
      ? 'Vou ajudá-la a organizar o seu dinheiro com clareza e calma.'
      : gender === 'male'
        ? 'Vou ajudá-lo a organizar o seu dinheiro com clareza e calma.'
        : 'Vou ajudar-te a organizar o teu dinheiro com clareza e calma.';

  const contextLine =
    gender === 'neutral'
      ? 'Mas primeiro preciso de conhecer melhor a tua realidade.'
      : 'Mas primeiro preciso de conhecer um pouco melhor a sua realidade.';

  return [`Prazer, ${firstName} 👋`, helpLine, contextLine];
}

export const GENDER_OPTIONS: Array<{ id: GenderId; label: string }> = [
  { id: 'male', label: 'Masculino' },
  { id: 'female', label: 'Feminino' },
  { id: 'neutral', label: 'Prefiro não dizer' },
];
