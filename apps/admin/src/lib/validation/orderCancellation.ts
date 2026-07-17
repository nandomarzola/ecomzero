import { z } from "zod";

export const orderCancellationReasonSchema = z.enum([
  "customer_request",
  "out_of_stock",
  "suspected_fraud",
  "other",
]);

export const orderCancellationFormSchema = z
  .object({
    reason: orderCancellationReasonSchema,
    note: z.string().trim().max(500, "A observação deve ter no máximo 500 caracteres.").optional(),
  })
  .superRefine((value, context) => {
    if (value.reason === "other" && !value.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Descreva o motivo quando selecionar Outro.",
      });
    }
  });

export type OrderCancellationFormInput = z.infer<typeof orderCancellationFormSchema>;
