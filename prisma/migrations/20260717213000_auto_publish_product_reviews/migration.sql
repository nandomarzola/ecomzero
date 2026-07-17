UPDATE "ProductReview"
SET
    "status" = 'approved',
    "moderatedAt" = CURRENT_TIMESTAMP,
    "moderatedBy" = 'automatic',
    "rejectionReason" = NULL
WHERE "status" = 'pending';

WITH "ApprovedReviewStats" AS (
    SELECT
        "productId",
        AVG("rating")::double precision AS "averageRating",
        COUNT(*)::integer AS "reviewCount"
    FROM "ProductReview"
    WHERE "status" = 'approved'
    GROUP BY "productId"
)
UPDATE "Product" AS product
SET
    "avaliacaoMedia" = stats."averageRating",
    "totalAvaliacoes" = stats."reviewCount"
FROM "ApprovedReviewStats" AS stats
WHERE product."id" = stats."productId";
