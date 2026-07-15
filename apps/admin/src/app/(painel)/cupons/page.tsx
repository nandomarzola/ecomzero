import CouponManager from "@/components/cupons/CouponManager";
import { listCoupons } from "@/lib/services/couponAdminService";

export const dynamic = "force-dynamic";

export default async function CuponsPage() {
  return <CouponManager coupons={await listCoupons()} />;
}
