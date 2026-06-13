import { z } from 'zod';

export const receiptConfirmedItemSchema = z.object({
  name: z.string().trim().min(1, 'Nome do item obrigatório'),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  totalPrice: z.number().positive('Valor do item inválido'),
  category: z.string().optional(),
});

export const receiptConfirmedItemsSchema = z.array(receiptConfirmedItemSchema);
