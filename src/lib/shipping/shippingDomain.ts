export const SHIPPING_LABEL_STATUS_RANK: Record<string, number> = {
  awaiting_payment: 0,
  awaiting_shipping_data: 1,
  awaiting_fiscal_document: 2,
  awaiting_invoice: 2,
  ready_to_purchase: 3,
  insufficient_balance: 3,
  error: 3,
  processing: 4,
  purchased: 5,
  generated: 6,
  printed: 7,
  posted: 8,
  in_transit: 9,
  delivered: 10,
  canceled: 10,
  external: 10,
  not_applicable: 10,
};

export const PROVIDER_LABEL_STATUS: Record<string, string> = {
  created: "ready_to_purchase",
  pending: "ready_to_purchase",
  released: "purchased",
  generated: "generated",
  received: "posted",
  posted: "in_transit",
  delivered: "delivered",
  undelivered: "in_transit",
  paused: "in_transit",
  suspended: "in_transit",
  canceled: "canceled",
  cancelled: "canceled",
};

export function isValidNfeKey(value: string): boolean {
  const key = value.replace(/\D/g, "");
  if (key.length !== 44) return false;
  const body = key.slice(0, 43);
  let weight = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const digit = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
  return digit === Number(key[43]);
}

export function canAdvanceShippingStatus(
  current: string,
  incoming: string,
): boolean {
  if (current === "delivered" && incoming === "canceled") return false;
  return (
    (SHIPPING_LABEL_STATUS_RANK[incoming] ?? -1) >=
    (SHIPPING_LABEL_STATUS_RANK[current] ?? -1)
  );
}

export function shouldAutomaticallyPurchase(input: {
  enabled: boolean;
  shippingMode: string;
  labelStatus: string;
}): boolean {
  return (
    input.enabled &&
    input.shippingMode === "melhor_envio" &&
    input.labelStatus === "ready_to_purchase"
  );
}
