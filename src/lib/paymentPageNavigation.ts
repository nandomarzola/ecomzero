export type PaymentPageOrderStatus =
  | "aguardando_pagamento"
  | "pago"
  | "cancelado";

export function paymentPageStatusRedirect(
  orderId: string,
  status: PaymentPageOrderStatus,
): string | null {
  if (status === "pago") return `/pedido/${orderId}/sucesso`;
  if (status === "cancelado") {
    return "/carrinho?pagamento=cancelado";
  }
  return null;
}

export function paymentPageErrorRedirect(
  code: "ORDER_NOT_FOUND" | "FORBIDDEN" | "INVALID_STATUS",
): string {
  if (code === "ORDER_NOT_FOUND") {
    return "/carrinho?pagamento=encerrado";
  }
  return "/carrinho";
}
