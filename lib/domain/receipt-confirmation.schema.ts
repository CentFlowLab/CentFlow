import { z } from 'zod';

import { requiredInputDateSchema } from './date-input.schema';

export const receiptConfirmationSchema = z.object({
  type: z.enum(['expense', 'income']),
  merchantName: z.string().min(1, 'Indica a loja ou merchant'),
  amount: z.number({ error: 'Indica um valor válido' }).positive('O valor tem de ser superior a zero'),
  category: z.string().min(1, 'Escolhe uma categoria'),
  description: z.string().max(200).optional(),
  date: requiredInputDateSchema,
});
