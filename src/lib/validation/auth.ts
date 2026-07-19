import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido")
  .max(160);

export const registrationPasswordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(72, "A senha deve ter no máximo 72 caracteres")
  .regex(/[A-Za-zÀ-ÿ]/, "A senha deve conter ao menos uma letra")
  .regex(/\d/, "A senha deve conter ao menos um número")
  .regex(/[^A-Za-zÀ-ÿ0-9\s]/, "A senha deve conter ao menos um caractere especial");

export const telefoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => /^[1-9]{2}9\d{8}$/.test(value), {
    message: "Informe um celular válido com DDD",
  });

export const registerSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome completo").max(120),
    email: emailSchema,
    telefone: telefoneSchema.optional(),
    senha: registrationPasswordSchema,
    aceitaMarketing: z.boolean().default(false),
  })
  .strict();

export const checkoutRegisterSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome completo").max(120),
    email: emailSchema,
    telefone: telefoneSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    senha: z.string().min(1, "Informe sua senha").max(72),
  })
  .strict();

export const passwordResetRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(32, "Token inválido").max(200, "Token inválido"),
    senhaNova: registrationPasswordSchema,
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type CheckoutRegisterInput = z.infer<typeof checkoutRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
