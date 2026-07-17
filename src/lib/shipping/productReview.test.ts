import assert from "node:assert/strict";
import test from "node:test";
import { isDeliveredOrder } from "@/lib/reviews/reviewDomain";
import { productReviewInputSchema } from "@/lib/validation/productReview";

test("libera avaliação somente quando o envio foi entregue", () => {
  assert.equal(
    isDeliveredOrder({ status: "posted", labelStatus: "in_transit", entregueEm: null }),
    false,
  );
  assert.equal(
    isDeliveredOrder({ status: "delivered", labelStatus: "in_transit", entregueEm: null }),
    true,
  );
  assert.equal(
    isDeliveredOrder({ status: "posted", labelStatus: "delivered", entregueEm: null }),
    true,
  );
});

test("valida nota, comentário e limite de fotos", () => {
  const photo = "https://ecomzero.public.blob.vercel-storage.com/avaliacoes/foto.webp";
  assert.equal(
    productReviewInputSchema.safeParse({ rating: 5, comment: "Ótimo", photos: [photo] }).success,
    true,
  );
  assert.equal(
    productReviewInputSchema.safeParse({ rating: 0, comment: null, photos: [] }).success,
    false,
  );
  assert.equal(
    productReviewInputSchema.safeParse({ rating: 4, comment: null, photos: [photo, photo, photo, photo] }).success,
    false,
  );
});
