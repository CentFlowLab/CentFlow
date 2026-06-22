import type { GenderId } from './types';

export function getWelcomeMessages(firstName: string, gender: GenderId | null): string[] {
  return getValuePromiseMessages(firstName);
}

export type ValuePromiseBullet = {
  emoji: string;
  text: string;
};

export function getValuePromiseMessages(firstName: string): string[] {
  const hasName = Boolean(firstName) && firstName !== 'Utilizador';
  return [
    hasName ? `Olá, ${firstName} 👋` : 'Bem-vindo à CentFlow 👋',
    'Vamos criar o teu espaço financeiro pessoal.',
    'Em menos de 1 minuto, adaptamos tudo a ti.',
  ];
}

export function getValuePromiseBullets(): ValuePromiseBullet[] {
  return [
    { emoji: '✓', text: 'Perceber para onde vai o teu dinheiro' },
    { emoji: '✓', text: 'Acompanhar objetivos de poupança' },
    { emoji: '✓', text: 'Organizar compras e garantias' },
    { emoji: '✓', text: 'Ter controlo sobre créditos e subscrições' },
  ];
}

export const GENDER_OPTIONS: Array<{ id: GenderId; label: string }> = [
  { id: 'neutral', label: 'Neutro (predefinição)' },
  { id: 'male', label: 'Masculino' },
  { id: 'female', label: 'Feminino' },
];
