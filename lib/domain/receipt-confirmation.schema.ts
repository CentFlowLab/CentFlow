import { z } from 'zod';

export const receiptConfirmationSchema = z.object({
  type: z.enum(['expense', 'income']),
  merchantName: z.string().min(1, 'Indica a loja ou merchant'),
  amount: z.number({ error: 'Indica um valor válido' }).positive('O valor tem de ser superior a zero'),
  category: z.string().min(1, 'Escolhe uma categoria'),
  description: z.string().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
});
