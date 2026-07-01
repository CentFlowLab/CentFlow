import { z } from 'zod';

import { requiredInputDateSchema } from './date-input.schema';

export const createTransactionSchema = z
  .object({
    type: z.enum(['expense', 'income', 'credit_payment']),
    amount: z
      .number({ error: 'Indica um valor válido' })
      .positive('O valor tem de ser superior a zero'),
    category: z.string().min(1, 'Escolhe uma categoria'),
    description: z.string().max(200, 'Máximo 200 caracteres').optional(),
    date: requiredInputDateSchema,
    accountId: z.string().nullable().optional(),
    creditId: z.string().nullable().optional(),
  })
  .refine((data) => !(data.accountId && data.creditId), {
    message: 'Escolhe conta ou cartão, não ambos.',
    path: ['accountId'],
  });

export const updateTransactionSchema = createTransactionSchema;

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionFormValues = z.infer<typeof updateTransactionSchema>;
