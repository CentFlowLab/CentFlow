import { z } from 'zod';

import { isPasswordStrongEnough, PASSWORD_POLICY_HINT } from '@/lib/security/passwordPolicy';

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
    password: z.string().min(1, 'Password obrigatória'),
    confirmPassword: z.string().min(1, 'Confirma a password'),
  })
  .superRefine((data, ctx) => {
    const validation = isPasswordStrongEnough(data.password, {
      email: data.email,
      name: data.name,
    });

    if (!validation) {
      ctx.addIssue({
        code: 'custom',
        message: PASSWORD_POLICY_HINT,
        path: ['password'],
      });
    }
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As passwords não coincidem',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z
  .object({
    password: z.string().min(1, 'Password obrigatória'),
    confirmPassword: z.string().min(1, 'Confirma a password'),
    email: z.string().optional(),
    name: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      !isPasswordStrongEnough(data.password, {
        email: data.email,
        name: data.name,
      })
    ) {
      ctx.addIssue({
        code: 'custom',
        message: PASSWORD_POLICY_HINT,
        path: ['password'],
      });
    }
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
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
