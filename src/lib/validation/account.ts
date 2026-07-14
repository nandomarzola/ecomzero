import { z } from "zod";
import {
  registrationPasswordSchema,
  telefoneSchema,
} from "@/lib/validation/auth";
import { cepSchema } from "@/lib/validation/shipping";

const nullablePhoneSchema = z.union([
  telefoneSchema,
  z.literal("").transform(() => null),
  z.null(),
]);

export const updateProfileSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome completo").max(120).optional(),
    telefone: nullablePhoneSchema.optional(),
  })
  .strict()
  .refine(
    (value) => value.nome !== undefined || value.telefone !== undefined,
    { message: "Informe ao menos um campo para atualizar" },
  );

export const changePasswordSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual").max(72),
    senhaNova: registrationPasswordSchema,
  })
  .strict();

const nullableTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || null)
    .nullable()
    .optional();

const addressFields = {
  apelido: nullableTextSchema(40),
  cep: cepSchema,
  logradouro: z.string().trim().min(3, "Logradouro inválido").max(160),
  numero: z.string().trim().min(1, "Número é obrigatório").max(20),
  complemento: nullableTextSchema(100),
  bairro: z.string().trim().min(2, "Bairro inválido").max(100),
  cidade: z.string().trim().min(2, "Cidade inválida").max(100),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "UF deve ter 2 letras"),
  padrao: z.boolean().optional(),
};

export const createAddressSchema = z.object(addressFields).strict();

export const updateAddressSchema = z
  .object(addressFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const addressIdSchema = z.string().uuid("Endereço inválido");

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
