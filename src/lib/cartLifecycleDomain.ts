export function buildPaidOrderTransition(payment: {
  id: string;
  status: string;
  approvedAt: Date | null;
}) {
  return {
    status: "pago" as const,
    sessionId: null,
    mercadoPagoPaymentId: payment.id,
    mercadoPagoPaymentStatus: payment.status,
    pagoEm: payment.approvedAt ?? new Date(),
  };
}
