import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAggregateRating,
  isDeliveredOrder,
} from "@/lib/reviews/reviewDomain";
import {
  productReviewInputSchema,
  productReviewSubmissionSchema,
} from "@/lib/validation/productReview";

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

test("valida o envio de avaliação pela página do produto", () => {
  const productId = "f202fdc9-4381-44d3-bde3-e612dc073c43";
  assert.equal(
    productReviewSubmissionSchema.safeParse({
      productId,
      rating: 5,
      comment: "Produto muito bom",
    }).success,
    true,
  );
  assert.equal(
    productReviewSubmissionSchema.safeParse({
      productId,
      rating: 6,
      comment: null,
    }).success,
    false,
  );
});

test("omite aggregateRating sem review aprovado e arredonda média legítima", () => {
  const withoutReviews = buildAggregateRating(null, 0);
  const productJsonLd = {
    "@type": "Product",
    ...(withoutReviews ? { aggregateRating: withoutReviews } : {}),
  };

  assert.equal("aggregateRating" in productJsonLd, false);
  assert.deepEqual(buildAggregateRating(4.666, 3), {
    "@type": "AggregateRating",
    ratingValue: 4.7,
    reviewCount: 3,
  });
});
