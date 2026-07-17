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

export const SHIPPING_MODE_LABEL: Record<string, string> = {
  melhor_envio: "Frete contratado",
  free_shipping_coupon: "Frete grátis por cupom",
  free_shipping_threshold: "Frete grátis da loja",
  external: "Envio externo",
  legacy: "Frete legado",
};

export function shippingModeLabel(mode: string): string {
  return SHIPPING_MODE_LABEL[mode] ?? "Não classificado";
}

export const LABEL_STATUS_LABEL: Record<string, string> = {
  not_applicable: "Não aplicável",
  awaiting_payment: "Aguardando pagamento",
  awaiting_shipping_data: "Aguardando dados de envio",
  awaiting_fiscal_document: "Aguardando decisão fiscal",
  awaiting_invoice: "Aguardando NF-e",
  ready_to_purchase: "Pronto para compra",
  insufficient_balance: "Saldo insuficiente",
  processing: "Gerando etiqueta",
  purchased: "Etiqueta comprada",
  generated: "Etiqueta gerada",
  printed: "Impressa",
  posted: "Postado",
  in_transit: "Em trânsito",
  delivered: "Entregue",
  error: "Erro na etiqueta",
  external: "Envio externo",
  canceled: "Cancelada",
};

export function labelStatusLabel(status: string): string {
  return LABEL_STATUS_LABEL[status] ?? status;
}

export function labelStatusTone(status: string): StatusTone {
  if (["generated", "printed", "delivered"].includes(status)) return "success";
  if (["posted", "in_transit", "purchased", "processing"].includes(status)) return "info";
  if (["error", "canceled", "insufficient_balance"].includes(status)) return "danger";
  if (["awaiting_payment", "awaiting_shipping_data", "awaiting_fiscal_document", "awaiting_invoice", "ready_to_purchase"].includes(status)) return "warning";
  return "neutral";
}

export function logisticsStatusLabel(status: string): string {
  if (status === "posted") return "Postado";
  if (status === "in_transit") return "Em trânsito";
  if (status === "delivered") return "Entregue";
  if (status === "external") return "Envio externo";
  if (status === "canceled") return "Cancelado";
  return "Preparação";
}
