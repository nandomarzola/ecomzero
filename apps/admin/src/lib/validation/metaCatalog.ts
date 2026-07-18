import { z } from "zod";

export const metaCatalogSettingsSchema = z.object({
  feedActive: z.boolean(),
  includeOutOfStock: z.boolean(),
  includeSalePrice: z.boolean(),
  includeAdditionalImages: z.boolean(),
  defaultBrand: z.string().trim().max(80),
  defaultCategory: z.string().trim().max(160),
});

export type MetaCatalogSettingsInput = z.infer<typeof metaCatalogSettingsSchema>;
