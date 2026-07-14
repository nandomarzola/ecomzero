import { z } from "zod";

// Aceita com ou sem hífen (ex: "01310-100" ou "01310100"); normaliza pra 8 dígitos.
export const cepSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => /^\d{8}$/.test(value), {
    message: "CEP inválido — precisa ter 8 dígitos",
  });

export const shippingQuoteSchema = z.object({
  variantId: z.string().uuid("variantId inválido"),
  cep: cepSchema,
});

export const cartShippingQuoteSchema = z
  .object({
    cep: cepSchema,
  })
  .strict();

export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;
export type CartShippingQuoteInput = z.infer<typeof cartShippingQuoteSchema>;
