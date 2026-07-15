import { auth } from "@/lib/auth";
import { hasCheckoutOrderAccess } from "@/lib/session";
import {
  getOrderPaymentStatus,
  reconcileMercadoPagoPayment,
} from "@/lib/services/orderPaymentService";
import {
  mercadoPagoPaymentIdSchema,
  paymentOrderIdSchema,
} from "@/lib/validation/payment";

type ReturnSearchParams = Record<string, string | string[] | undefined>;

export async function resolveOrderReturnStatus(
  orderId: string,
  searchParams: ReturnSearchParams,
) {
  const parsedOrderId = paymentOrderIdSchema.safeParse(orderId);
  if (!parsedOrderId.success) return null;

  const rawPaymentId = searchParams.payment_id;
  const parsedPaymentId = mercadoPagoPaymentIdSchema.safeParse(
    Array.isArray(rawPaymentId) ? rawPaymentId[0] : rawPaymentId,
  );

  if (parsedPaymentId.success) {
    await reconcileMercadoPagoPayment(parsedPaymentId.data).catch(() => null);
  }

  const [session, hasGuestAccess] = await Promise.all([
    auth(),
    hasCheckoutOrderAccess(parsedOrderId.data),
  ]);

  return getOrderPaymentStatus(parsedOrderId.data, {
    userId: session?.user?.id ?? null,
    hasGuestAccess,
  }).catch(() => null);
}
