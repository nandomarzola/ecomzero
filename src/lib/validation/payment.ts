import { z } from "zod";

export const paymentOrderIdSchema = z.string().uuid("Pedido inválido");
