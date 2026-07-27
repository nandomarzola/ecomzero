import assert from "node:assert/strict";
import test from "node:test";
import {
  getVolumePriceForQuantity,
  getVolumePricing,
} from "@/lib/productVolumePricing";

const quantityVariants = [
  { id: "one", label: "1 UNIDADE", precoDe: 13.99, precoPor: 8.99 },
  { id: "two", label: "2 UNIDADES", precoDe: 22.99, precoPor: 16.99 },
  { id: "three", label: "3 UNIDADES", precoDe: 29.99, precoPor: 21.99 },
];

test("reconhece somente um catálogo composto por faixas puras de quantidade", () => {
  assert.equal(getVolumePricing(quantityVariants)?.canonicalVariantId, "one");
  assert.equal(
    getVolumePricing([
      quantityVariants[0],
      { id: "black", label: "Preto", precoDe: 13.99, precoPor: 8.99 },
    ]),
    null,
  );
  assert.equal(
    getVolumePricing([
      { id: "pack", label: "1 PACOTE (48 UNIDADES)", precoDe: 30, precoPor: 25 },
      { id: "packs", label: "2 PACOTES (96 UNIDADES)", precoDe: 55, precoPor: 45 },
    ]),
    null,
  );
});

test("converte o preço total legado da faixa em preço unitário progressivo", () => {
  const twoUnits = getVolumePriceForQuantity(quantityVariants, 2);
  const fourUnits = getVolumePriceForQuantity(quantityVariants, 4);

  assert.equal(twoUnits?.unitPrice, 8.5);
  assert.equal(twoUnits?.total, 17);
  assert.equal(fourUnits?.activeTier.quantity, 3);
  assert.equal(fourUnits?.unitPrice, 7.33);
  assert.equal(fourUnits?.total, 29.32);
});
