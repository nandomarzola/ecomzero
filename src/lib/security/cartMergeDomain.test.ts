import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeCartLines,
  selectMergedCouponId,
} from "@/lib/cartMergeDomain";

test("mescla variantes iguais entre dispositivos e respeita o limite", () => {
  assert.deepEqual(
    mergeCartLines(
      [
        { variantId: "blue", canonicalVariantId: "blue", quantity: 8 },
        { variantId: "blue", canonicalVariantId: "blue", quantity: 15 },
        { variantId: "red", canonicalVariantId: "red", quantity: 2 },
      ],
      20,
    ),
    [
      { variantId: "blue", quantity: 20 },
      { variantId: "red", quantity: 2 },
    ],
  );
});

test("consolida combos legados na variante canônica de unidade", () => {
  assert.deepEqual(
    mergeCartLines(
      [
        { variantId: "one", canonicalVariantId: "one", quantity: 1 },
        { variantId: "three", canonicalVariantId: "one", quantity: 3 },
      ],
      20,
    ),
    [{ variantId: "one", quantity: 4 }],
  );
});

test("prioriza o cupom do carrinho aberto no dispositivo", () => {
  assert.equal(
    selectMergedCouponId([
      "coupon-device",
      "coupon-account",
      "coupon-older",
    ]),
    "coupon-device",
  );
  assert.equal(
    selectMergedCouponId([null, "coupon-account"]),
    "coupon-account",
  );
  assert.equal(selectMergedCouponId([null, null]), null);
});
