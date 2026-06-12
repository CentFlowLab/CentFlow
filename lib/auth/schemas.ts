import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'Password obrigatória')
    .min(6, 'Password deve ter pelo menos 6 caracteres'),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nome obrigatório')
      .min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z
      .string()
      .min(1, 'Email obrigatório')
      .email('Email inválido'),
    password: z
      .string()
      .min(1, 'Password obrigatória')
      .min(8, 'Password deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma a password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As passwords não coincidem',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email obrigatório')
    .email('Email inválido'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
