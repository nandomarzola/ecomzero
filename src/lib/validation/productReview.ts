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

const reviewRatingSchema = z.number().int().min(1).max(5);

const reviewCommentSchema = z
  .string()
  .trim()
  .max(1000, "O comentário deve ter no máximo 1000 caracteres")
  .nullable()
  .transform((value) => value || null);

export const productReviewInputSchema = z.object({
  rating: reviewRatingSchema,
  comment: reviewCommentSchema,
  photos: z.array(reviewPhotoUrlSchema).max(3, "Envie no máximo 3 fotos"),
});

export const orderItemIdSchema = z.string().uuid();
export const productIdSchema = z.string().uuid();

export const productReviewSubmissionSchema = z.object({
  productId: productIdSchema,
  rating: reviewRatingSchema,
  comment: reviewCommentSchema.optional().default(null),
});

export const productReviewPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type ProductReviewInput = z.infer<typeof productReviewInputSchema>;
export type ProductReviewSubmissionInput = z.infer<
  typeof productReviewSubmissionSchema
>;
