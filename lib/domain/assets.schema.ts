import { z } from 'zod';

export const createGoalSchema = z.object({
  name: z.string().min(1, 'Indica o nome do objetivo').max(80),
  target: z.number().positive('O valor alvo tem de ser superior a zero'),
  current: z.number().min(0, 'O valor actual não pode ser negativo').default(0),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .optional()
    .or(z.literal('')),
});

export const createWarrantySchema = z.object({
  product: z.string().min(1, 'Indica o produto').max(120),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  store: z.string().max(80).optional(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .optional()
    .or(z.literal('')),
  receiptTransactionId: z.string().optional(),
  receiptId: z.string().optional().nullable(),
  receiptLabel: z.string().max(120).optional(),
});

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Indica o nome do item').max(120),
  value: z.number().min(0, 'O valor não pode ser negativo'),
  category: z.string().max(40).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = CreateGoalInput;
export type CreateWarrantyInput = z.infer<typeof createWarrantySchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
