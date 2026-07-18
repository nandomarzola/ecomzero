import { metaCatalogContentId } from "@/lib/metaCatalogIds";

type MetaPixelEventName = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

export type MetaPixelItem = {
  variantId: string;
  quantity: number;
  unitPrice: number;
};

declare global {
  interface Window {
    fbq?: (
      command: "track",
      eventName: MetaPixelEventName,
      payload: Record<string, unknown>,
      options?: { eventID: string },
    ) => void;
  }
}

export function metaPixelContentIds(items: MetaPixelItem[]): string[] {
  return items.map((item) => metaCatalogContentId(item.variantId));
}

export function trackMetaPixelCommerceEvent(input: {
  event: MetaPixelEventName;
  items: MetaPixelItem[];
  value: number;
  contentName?: string;
  eventId?: string;
}): boolean {
  if (typeof window === "undefined" || input.items.length === 0) return false;

  const payload: Record<string, unknown> = {
    content_ids: metaPixelContentIds(input.items),
    content_type: "product",
    contents: input.items.map((item) => ({
      id: metaCatalogContentId(item.variantId),
      quantity: item.quantity,
      item_price: item.unitPrice,
    })),
    currency: "BRL",
    value: Number(input.value.toFixed(2)),
  };
  if (input.contentName) payload.content_name = input.contentName;

  const send = () => window.fbq?.(
    "track",
    input.event,
    payload,
    input.eventId ? { eventID: input.eventId } : undefined,
  );

  if (typeof window.fbq === "function") {
    send();
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (typeof window.fbq === "function") {
      window.clearInterval(timer);
      send();
    } else if (attempts >= 10) {
      window.clearInterval(timer);
    }
  }, 200);
  return true;
}
