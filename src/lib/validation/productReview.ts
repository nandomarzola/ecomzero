import { z } from "zod";

const reviewPhotoUrlSchema = z
  .string()
  .url("URL de foto inválida")
  .max(600)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  }, "A foto precisa ter sido enviada pela EcomZero");

export const productReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(1000, "O comentário deve ter no máximo 1000 caracteres")
    .nullable()
    .transform((value) => value || null),
  photos: z.array(reviewPhotoUrlSchema).max(3, "Envie no máximo 3 fotos"),
});

export const orderItemIdSchema = z.string().uuid();

export type ProductReviewInput = z.infer<typeof productReviewInputSchema>;
