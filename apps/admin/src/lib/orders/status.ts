// Apresentação de status de pedido — labels, tons de badge e rótulo de pagamento.
// Sem Prisma: usado por componentes de UI. Mesma paleta de tons já usada no
// RecentOrdersTable do dashboard (success = verde de marca, warning = âmbar,
// danger = vermelho), com um tom `info` (azul) reservado para estados de envio
// futuros (ex.: "Entregue"), conforme pedido.

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export const ORDER_STATUS_LABEL: Record<string, string> = {
  draft: "Carrinho",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
};

export function orderStatusTone(status: string): StatusTone {
  switch (status) {
    case "pago":
      return "success";
    case "cancelado":
      return "danger";
    case "aguardando_pagamento":
      return "warning";
    default:
      return "neutral";
  }
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}

// O schema não guarda o método de pagamento (Pix/Boleto/Cartão) — só os campos
// do Mercado Pago (preferenceId/paymentId/paymentStatus). Enquanto esse dado não
// existir, exibimos o canal real ("Mercado Pago") para pedidos pagos e "—" para
// os demais. Assim que houver um campo de método, basta passá-lo aqui.
export function paymentMethodLabel(status: string, method: string | null): string {
  if (method) return method;
  return status === "pago" ? "Mercado Pago" : "—";
}
