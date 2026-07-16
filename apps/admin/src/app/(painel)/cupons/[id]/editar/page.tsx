import { notFound } from "next/navigation";
import CouponForm from "@/components/cupons/CouponForm";
import { getCoupon } from "@/lib/services/couponAdminService";

export const dynamic = "force-dynamic";

export default async function EditarCupomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupon = await getCoupon(id);
  if (!coupon) notFound();
  return <CouponForm coupon={coupon} />;
}
