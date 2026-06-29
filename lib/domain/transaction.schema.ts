import { z } from 'zod';

import { requiredInputDateSchema } from './date-input.schema';

export const createTransactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z
    .number({ error: 'Indica um valor válido' })
    .positive('O valor tem de ser superior a zero'),
  category: z.string().min(1, 'Escolhe uma categoria'),
  merchant: z.string().max(120, 'Máximo 120 caracteres').optional(),
  description: z.string().max(200, 'Máximo 200 caracteres').optional(),
  date: requiredInputDateSchema,
});

export const updateTransactionSchema = createTransactionSchema;

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionFormValues = z.infer<typeof updateTransactionSchema>;
