import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";

type WebhookData = {
  id?: unknown;
  protocol?: unknown;
  status?: unknown;
  tracking?: unknown;
  tracking_url?: unknown;
  tags?: unknown;
  paid_at?: unknown;
  generated_at?: unknown;
  posted_at?: unknown;
  delivered_at?: unknown;
};

type WebhookBody = {
  event?: unknown;
  data?: WebhookData;
};

function safeDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function signatureIsValid(rawBody: string, received: string | null, secret: string) {
  if (!received) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: NextRequest) {
  const secret = config.melhorEnvio.clientSecret;
  if (!secret) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!signatureIsValid(rawBody, request.headers.get("x-me-signature"), secret)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Notificação inválida" }, { status: 400 });
  }
  const data = body?.data;
  if (!data || typeof data.id !== "string") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const tagOrderId = Array.isArray(data.tags)
    ? data.tags.find(
        (tag): tag is { tag: string } =>
          Boolean(tag && typeof tag === "object" && "tag" in tag && typeof tag.tag === "string"),
      )?.tag
    : undefined;
  const eventStatus =
    typeof body.event === "string" && body.event.startsWith("order.")
      ? body.event.slice("order.".length)
      : null;
  const status = typeof data.status === "string" ? data.status : eventStatus;
  const trackingUrl =
    typeof data.tracking_url === "string" && data.tracking_url.startsWith("https://")
      ? data.tracking_url
      : null;

  const result = await prisma.shipment.updateMany({
    where: {
      OR: [
        { melhorEnvioId: data.id },
        ...(tagOrderId ? [{ orderId: tagOrderId }] : []),
      ],
    },
    data: {
      melhorEnvioId: data.id,
      ...(typeof data.protocol === "string" ? { melhorEnvioProtocol: data.protocol } : {}),
      ...(status ? { status } : {}),
      ...(typeof data.tracking === "string" ? { codigoRastreio: data.tracking } : {}),
      ...(trackingUrl ? { urlRastreio: trackingUrl } : {}),
      ...(safeDate(data.paid_at) ? { compradoEm: safeDate(data.paid_at) } : {}),
      ...(safeDate(data.generated_at) ? { geradoEm: safeDate(data.generated_at) } : {}),
      ...(safeDate(data.posted_at) ? { postadoEm: safeDate(data.posted_at) } : {}),
      ...(safeDate(data.delivered_at) ? { entregueEm: safeDate(data.delivered_at) } : {}),
      ultimoErro: null,
    },
  });

  return NextResponse.json({ received: true, matched: result.count > 0 });
}
