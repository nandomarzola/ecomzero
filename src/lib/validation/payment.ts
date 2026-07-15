import { z } from "zod";

export const paymentOrderIdSchema = z.string().uuid("Pedido inválido");

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
