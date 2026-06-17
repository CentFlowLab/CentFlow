import type { GenderId } from './types';

export function getWelcomeMessages(firstName: string, gender: GenderId | null): string[] {
  return getValuePromiseMessages(firstName);
}

export type ValuePromiseBullet = {
  emoji: string;
  text: string;
};

export function getValuePromiseMessages(firstName: string): string[] {
  return [
    `Olá ${firstName} 👋`,
    'Sou a CentFlow.',
    'Vou ajudar-te a ter uma visão clara da tua vida financeira.',
    'Vamos preparar tudo em menos de 1 minuto.',
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
