import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z
    .number({ error: 'Indica um valor válido' })
    .positive('O valor tem de ser superior a zero'),
  category: z.string().min(1, 'Escolhe uma categoria'),
  description: z.string().max(200, 'Máximo 200 caracteres').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
});

export const updateTransactionSchema = createTransactionSchema;

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionFormValues = z.infer<typeof updateTransactionSchema>;
