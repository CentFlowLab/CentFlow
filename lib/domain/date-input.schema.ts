import { z } from 'zod';

import { inputDateToIso, isValidInputDate } from '@/lib/utils/format';

/** Data opcional em formulários (DD-MM-AAAA ou ISO legado) → ISO para API. */
export const optionalInputDateSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine((val) => !val || isValidInputDate(val), 'Data inválida')
  .transform((val) => {
    if (!val) return '';
    return inputDateToIso(val) ?? '';
  });

/** Data obrigatória em formulários → ISO para API. */
export const requiredInputDateSchema = z
  .string()
  .min(1, 'Data inválida')
  .refine(isValidInputDate, 'Data inválida')
  .transform((val) => inputDateToIso(val)!);
