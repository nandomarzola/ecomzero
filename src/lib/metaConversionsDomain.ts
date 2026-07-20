import { createHash } from "node:crypto";
import { metaCatalogContentId } from "@/lib/metaCatalogIds";

export type MetaPurchaseConversionInput = {
  orderId: string;
  eventTime: Date;
  total: number;
  email: string | null;
  phone: string | null;
  items: Array<{
    variantId: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export type MetaPurchaseServerEvent = {
  event_name: "Purchase";
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: "website";
  user_data: {
    em?: string[];
    ph?: string[];
  };
  custom_data: {
    currency: "BRL";
    value: number;
    content_type: "product";
    content_ids: string[];
    contents: Array<{
      id: string;
      quantity: number;
      item_price: number;
    }>;
    order_id: string;
  };
};

export function normalizeMetaEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeMetaPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

export function hashMetaUserData(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buildMetaPurchaseServerEvent(
  input: MetaPurchaseConversionInput,
): MetaPurchaseServerEvent {
  const email = input.email ? normalizeMetaEmail(input.email) : "";
  const phone = input.phone ? normalizeMetaPhone(input.phone) : "";
  const userData: MetaPurchaseServerEvent["user_data"] = {};
  if (email) userData.em = [hashMetaUserData(email)];
  if (phone) userData.ph = [hashMetaUserData(phone)];

  const contents = input.items.map((item) => ({
    id: metaCatalogContentId(item.variantId),
    quantity: item.quantity,
    item_price: Number(item.unitPrice.toFixed(2)),
  }));

  return {
    event_name: "Purchase",
    event_time: Math.floor(input.eventTime.getTime() / 1000),
    event_id: `purchase_${input.orderId}`,
    event_source_url: `https://www.ecomzero.com.br/pedido/${encodeURIComponent(input.orderId)}/sucesso`,
    action_source: "website",
    user_data: userData,
    custom_data: {
      currency: "BRL",
      value: Number(input.total.toFixed(2)),
      content_type: "product",
      content_ids: contents.map((item) => item.id),
      contents,
      order_id: input.orderId,
    },
  };
}
