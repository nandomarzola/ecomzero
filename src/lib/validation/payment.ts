import { z } from "zod";

export const paymentOrderIdSchema = z.string().uuid("Pedido inválido");

const optionalIssuerIdSchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => (value === undefined ? undefined : String(value)))
  .pipe(
    z
      .string()
      .regex(/^\d+$/, "Emissor do cartão inválido")
      .optional(),
  );

export const brickPaymentSchema = z
  .object({
    attemptId: z.string().uuid("Tentativa de pagamento inválida"),
    formData: z
      .object({
        payment_method_id: z
          .string()
          .trim()
          .min(1, "Forma de pagamento inválida")
          .max(64)
          .regex(/^[a-z0-9_]+$/i, "Forma de pagamento inválida"),
        token: z.string().trim().min(20).max(512).optional(),
        issuer_id: optionalIssuerIdSchema,
        installments: z.coerce.number().int().min(1).max(24).optional(),
      })
      .passthrough(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.formData.payment_method_id !== "pix" && !value.formData.token) {
      context.addIssue({
        code: "custom",
        path: ["formData", "token"],
        message: "Os dados do cartão não foram tokenizados",
      });
    }

  });

export type BrickPaymentInput = z.infer<typeof brickPaymentSchema>;

export const mercadoPagoPaymentIdSchema = z
  .union([z.string(), z.number().int().nonnegative()])
  .transform(String)
  .pipe(z.string().regex(/^\d+$/, "Pagamento inválido"));

export const mercadoPagoWebhookSchema = z
  .object({
    action: z.string().optional(),
    type: z.string().optional(),
    data: z
      .object({ id: z.union([z.string(), z.number()]) })
      .optional(),
  })
  .passthrough();
