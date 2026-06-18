export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very_strong';

export type PasswordValidationResult = {
  valid: boolean;
  strength: PasswordStrength;
  score: number;
  errors: string[];
  hints: string[];
};

export const PASSWORD_POLICY_HINT =
  'Usa pelo menos 12 caracteres, incluindo número, símbolo e letras maiúsculas/minúsculas.';

const MIN_LENGTH = 12;

const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'password123',
  'qwerty',
  'qwerty123',
  'centflow123',
  'centflow',
  'admin123',
  'letmein',
  'welcome',
  'iloveyou',
  '11111111',
  '00000000',
  'abc123456789',
]);

export type PasswordContext = {
  email?: string;
  name?: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasUppercase(value: string): boolean {
  return /[A-Z]/.test(value);
}

function hasLowercase(value: string): boolean {
  return /[a-z]/.test(value);
}

function hasNumber(value: string): boolean {
  return /\d/.test(value);
}

function hasSymbol(value: string): boolean {
  return /[^A-Za-z0-9]/.test(value);
}

function isSimilarToIdentity(password: string, context?: PasswordContext): boolean {
  const normalizedPassword = normalize(password);
  const email = normalize(context?.email ?? '');
  const name = normalize(context?.name ?? '');

  if (email && normalizedPassword === email) return true;
  if (email && email.includes('@')) {
    const localPart = email.split('@')[0];
    if (localPart.length >= 4 && normalizedPassword.includes(localPart)) return true;
  }

  if (name.length >= 3 && normalizedPassword.includes(name.replace(/\s+/g, ''))) return true;

  return false;
}

export function scorePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= MIN_LENGTH) score += 1;
  if (password.length >= 16) score += 1;
  if (hasUppercase(password)) score += 1;
  if (hasLowercase(password)) score += 1;
  if (hasNumber(password)) score += 1;
  if (hasSymbol(password)) score += 1;
  if (password.length >= 20) score += 1;

  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  if (score <= 6) return 'strong';
  return 'very_strong';
}

export function validatePassword(
  password: string,
  context?: PasswordContext,
): PasswordValidationResult {
  const errors: string[] = [];
  const hints: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Mínimo ${MIN_LENGTH} caracteres.`);
  }
  if (!hasUppercase(password)) {
    errors.push('Inclui pelo menos uma letra maiúscula.');
  }
  if (!hasLowercase(password)) {
    errors.push('Inclui pelo menos uma letra minúscula.');
  }
  if (!hasNumber(password)) {
    errors.push('Inclui pelo menos um número.');
  }
  if (!hasSymbol(password)) {
    errors.push('Inclui pelo menos um símbolo.');
  }
  if (COMMON_PASSWORDS.has(normalize(password))) {
    errors.push('Esta palavra-passe é demasiado comum.');
  }
  if (isSimilarToIdentity(password, context)) {
    errors.push('Não uses o email ou nome na palavra-passe.');
  }

  const strength = scorePasswordStrength(password);
  const valid = errors.length === 0;

  if (!valid && hints.length === 0) {
    hints.push(PASSWORD_POLICY_HINT);
  }

  return {
    valid,
    strength,
    score:
      strength === 'weak'
        ? 1
        : strength === 'medium'
          ? 2
          : strength === 'strong'
            ? 3
            : 4,
    errors,
    hints,
  };
}

export function isPasswordStrongEnough(password: string, context?: PasswordContext): boolean {
  return validatePassword(password, context).valid;
}
