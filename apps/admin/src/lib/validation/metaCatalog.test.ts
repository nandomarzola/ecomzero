import assert from "node:assert/strict";
import test from "node:test";
import { metaCatalogSettingsSchema } from "./metaCatalog";

test("aceita e normaliza configurações persistentes do Catálogo da Meta", () => {
  const settings = metaCatalogSettingsSchema.parse({
    feedActive: true,
    includeOutOfStock: true,
    includeSalePrice: true,
    includeAdditionalImages: true,
    defaultBrand: "  EcomZero  ",
    defaultCategory: "  Casa > Utilidades  ",
  });

  assert.equal(settings.defaultBrand, "EcomZero");
  assert.equal(settings.defaultCategory, "Casa > Utilidades");
});

test("rejeita textos acima do limite do banco e da interface", () => {
  const result = metaCatalogSettingsSchema.safeParse({
    feedActive: true,
    includeOutOfStock: true,
    includeSalePrice: true,
    includeAdditionalImages: true,
    defaultBrand: "x".repeat(81),
    defaultCategory: "",
  });
  assert.equal(result.success, false);
});
