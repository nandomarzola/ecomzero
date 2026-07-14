import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.string().uuid("variante inválida"),
  quantidade: z.coerce.number().int().min(1),
});

export const updateCartItemSchema = z.object({
  itemId: z.string().uuid("item inválido"),
  quantidade: z.coerce.number().int().min(1),
});

export const removeCartItemSchema = z.object({
  itemId: z.string().uuid("item inválido"),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;
