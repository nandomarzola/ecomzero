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
  // Quantidade selecionada na página. Opcional (default 1) — o peso enviado à
  // API é pesoKg × quantidade, então quantidades diferentes cotam diferente.
  quantidade: z.coerce.number().int().min(1, "Quantidade mínima é 1").default(1),
});

export const cartShippingQuoteSchema = z
  .object({
    cep: cepSchema,
  })
  .strict();

export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;
export type CartShippingQuoteInput = z.infer<typeof cartShippingQuoteSchema>;
