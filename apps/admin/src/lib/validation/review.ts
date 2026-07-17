import { z } from "zod";

export const moderateReviewSchema = z
  .object({
    reviewId: z.string().uuid(),
    status: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().trim().max(500).nullable(),
  })
  .refine(
    (value) => value.status !== "rejected" || Boolean(value.rejectionReason),
    { message: "Informe o motivo da rejeição", path: ["rejectionReason"] },
  );
