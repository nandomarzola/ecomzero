ALTER TABLE "AnnouncementBarItem"
ADD COLUMN "couponId" TEXT;

CREATE INDEX "AnnouncementBarItem_couponId_idx"
ON "AnnouncementBarItem"("couponId");

ALTER TABLE "AnnouncementBarItem"
ADD CONSTRAINT "AnnouncementBarItem_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "Coupon"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
