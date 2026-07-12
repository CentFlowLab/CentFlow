import { z } from 'zod';

import { requiredInputDateSchema } from './date-input.schema';

export const createTransactionSchema = z
  .object({
    type: z.enum([
      'expense',
      'income',
      'credit_payment',
      'credit_card_purchase',
      'credit_card_payment',
      'credit_card_refund',
    ]),
    amount: z
      .number({ error: 'Indica um valor válido' })
      .positive('O valor tem de ser superior a zero'),
    category: z.string().min(1, 'Escolhe uma categoria'),
    description: z.string().max(200, 'Máximo 200 caracteres').optional(),
    date: requiredInputDateSchema,
    accountId: z.string().nullable().optional(),
    creditId: z.string().nullable().optional(),
    relatedTransactionId: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'credit_card_purchase' || data.type === 'credit_card_refund') {
        return Boolean(data.creditId) && !data.accountId;
      }
      if (data.type === 'credit_card_payment' || data.type === 'credit_payment') {
        return Boolean(data.creditId);
      }
      return !(data.accountId && data.creditId);
    },
    {
      message: 'Movimento inválido — verifica cartão ou conta.',
      path: ['accountId'],
    },
  );

export const updateTransactionSchema = z
  .object({
    type: z.enum([
      'expense',
      'income',
      'credit_payment',
      'credit_card_purchase',
      'credit_card_payment',
      'credit_card_refund',
    ]),
    amount: z
      .number({ error: 'Indica um valor válido' })
      .positive('O valor tem de ser superior a zero'),
    category: z.string().min(1, 'Escolhe uma categoria'),
    description: z.string().max(200, 'Máximo 200 caracteres').optional(),
    date: requiredInputDateSchema,
    accountId: z.string().nullable().optional(),
    creditId: z.string().nullable().optional(),
    relatedTransactionId: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'credit_card_purchase' || data.type === 'credit_card_refund') {
        return Boolean(data.creditId) && !data.accountId;
      }
      if (data.type === 'credit_card_payment' || data.type === 'credit_payment') {
        return Boolean(data.creditId);
      }
      return !(data.accountId && data.creditId);
    },
    {
      message: 'Movimento inválido — verifica cartão ou conta.',
      path: ['accountId'],
    },
  );

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionFormValues = z.infer<typeof updateTransactionSchema>;
