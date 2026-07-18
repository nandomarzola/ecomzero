import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { safeCompare } from "@/lib/security/safeCompare";
import { getMetaCatalogReport } from "@/lib/services/metaCatalogService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!config.storefrontSyncApiKey) {
    return NextResponse.json(
      { error: "Integração interna não configurada neste ambiente." },
      { status: 503 },
    );
  }

  if (!safeCompare(request.headers.get("authorization"), `Bearer ${config.storefrontSyncApiKey}`)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const report = await getMetaCatalogReport();
    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Falha ao validar Catálogo da Meta", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível validar o catálogo." },
      { status: 500 },
    );
  }
}
