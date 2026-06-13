import { z } from 'zod';

export function parseGoalAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export function mapZodFieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const key = issue.path[0];
    if (typeof key === 'string') fieldErrors[key] = issue.message;
  });
  return fieldErrors;
}

export function formatGoalAmount(value: number): string {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',');
}
