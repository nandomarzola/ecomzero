import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getMelhorEnvioLabelFile,
  type LabelFileFormat,
} from "@/lib/services/shippingFulfillmentAdminService";

const formats = new Set<LabelFileFormat>(["jpeg", "pdf", "zpl"]);
const contentTypes: Record<LabelFileFormat, string> = {
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  zpl: "application/vnd.zebra-zpl",
};

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
  _request: Request,
  { params }: { params: Promise<{ id: string; format: string }> },
) {
  if (!(await auth())?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id, format: rawFormat } = await params;
  if (!formats.has(rawFormat as LabelFileFormat)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }
  const format = rawFormat as LabelFileFormat;

  try {
    const upstream = await getMelhorEnvioLabelFile(id, format);
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
        "Content-Type": upstreamType || contentTypes[format],
        "Content-Disposition": `${format === "zpl" ? "attachment" : "inline"}; filename="ecomzero-${id.slice(0, 8)}.${format}"`,
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
