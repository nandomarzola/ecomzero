import { z } from "zod";
import { cepSchema } from "@/lib/validation/shipping";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

function hasRepeatedDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

function calculateCpfDigit(base: string): number {
  const sum = [...base].reduce(
    (total, digit, index) => total + Number(digit) * (base.length + 1 - index),
    0,
  );
  const digit = 11 - (sum % 11);
  return digit >= 10 ? 0 : digit;
}

function isValidCpf(value: string): boolean {
  if (value.length !== 11 || hasRepeatedDigits(value)) return false;
  const firstDigit = calculateCpfDigit(value.slice(0, 9));
  const secondDigit = calculateCpfDigit(`${value.slice(0, 9)}${firstDigit}`);
  return value.endsWith(`${firstDigit}${secondDigit}`);
}

function calculateCnpjDigit(base: string, weights: number[]): number {
  const sum = [...base].reduce(
    (total, digit, index) => total + Number(digit) * weights[index],
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCnpj(value: string): boolean {
  if (value.length !== 14 || hasRepeatedDigits(value)) return false;
  const base = value.slice(0, 12);
  const firstDigit = calculateCnpjDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateCnpjDigit(`${base}${firstDigit}`, [
    6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);
  return value.endsWith(`${firstDigit}${secondDigit}`);
}

const telefoneSchema = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine((value) => /^[1-9]{2}(?:9\d{8}|[2-8]\d{7})$/.test(value), {
    message: "Telefone brasileiro inválido",
  });

const cpfCnpjSchema = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine((value) => isValidCpf(value) || isValidCnpj(value), {
    message: "CPF ou CNPJ inválido",
  });

export const checkoutSchema = z
  .object({
    nome: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(120),
    email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
    telefone: telefoneSchema,
    cpfCnpj: cpfCnpjSchema,
    cep: cepSchema,
    logradouro: z.string().trim().min(3, "Logradouro inválido").max(160),
    numero: z.string().trim().min(1, "Número é obrigatório").max(20),
    complemento: z.string().trim().max(100).optional(),
    bairro: z.string().trim().min(2, "Bairro inválido").max(100),
    cidade: z.string().trim().min(2, "Cidade inválida").max(100),
    uf: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "UF deve ter 2 letras"),
    shippingQuoteId: z.string().uuid("Cotação de frete inválida"),
    shippingOptionId: z.string().trim().min(1, "Opção de frete inválida").max(100),
  })
  .strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;
