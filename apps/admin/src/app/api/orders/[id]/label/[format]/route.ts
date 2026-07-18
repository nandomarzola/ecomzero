import { NextResponse } from "next/server";
import { requireVerifiedAdmin } from "@/lib/security/adminAuthorization";
import {
  getMelhorEnvioLabelFile,
  markShipmentPrinted,
} from "@/lib/services/shippingFulfillmentAdminService";

export const maxDuration = 60;

function findUrl(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("https://")) return value;
  if (!value || typeof value !== "object") return null;
  for (const nested of Object.values(value)) {
    const url = findUrl(nested);
    if (url) return url;
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; format: string }> },
) {
  if (!(await requireVerifiedAdmin()).ok) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id, format: rawFormat } = await params;
  if (rawFormat !== "pdf" && rawFormat !== "jpeg") {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  try {
    const upstream = await getMelhorEnvioLabelFile(id, rawFormat);
    await markShipmentPrinted(id);
    const upstreamType = upstream.headers.get("content-type") ?? "";
    if (upstreamType.includes("application/json")) {
      const data = await upstream.json().catch(() => null);
      const url = findUrl(data);
      if (url) return NextResponse.redirect(url);
      return NextResponse.json(
        { error: "Arquivo de etiqueta indisponível" },
        { status: 502 },
      );
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type":
          upstreamType ||
          (rawFormat === "pdf" ? "application/pdf" : "image/jpeg"),
        "Content-Disposition": `${new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="ecomzero-${id.slice(0, 8)}.${rawFormat}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível baixar a etiqueta.",
      },
      { status: 502 },
    );
  }
}
