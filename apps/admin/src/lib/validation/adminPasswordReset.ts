import { z } from "zod";

const adminPasswordSchema = z
  .string()
  .min(10, "A senha precisa ter pelo menos 10 caracteres")
  .max(72, "A senha deve ter no máximo 72 caracteres")
  .refine((value) => /[a-z]/.test(value), "Inclua uma letra minúscula")
  .refine((value) => /[A-Z]/.test(value), "Inclua uma letra maiúscula")
  .refine((value) => /\d/.test(value), "Inclua um número");

export const adminPasswordResetRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido"),
  })
  .strict();

export const adminPasswordResetConfirmSchema = z
  .object({
    token: z.string().min(40, "Token inválido").max(1000, "Token inválido"),
    newPassword: adminPasswordSchema,
  })
  .strict();
