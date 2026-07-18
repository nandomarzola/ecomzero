import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { safeCompare } from "@/lib/security/safeCompare";
import { syncCatalogPayloadSchema } from "@/lib/validation/sync";
import { syncProductsFromHub } from "@/lib/services/productService";

// Rota "burra": autentica → valida com Zod → chama o service → devolve
// resposta. Chamada pelo admin do Hub (projeto-ecomzero-hub), nunca pelo
// próprio site. Ver STOREFRONT_SYNC_API_KEY no .env.example.
export async function POST(request: NextRequest) {
  if (!config.storefrontSyncApiKey) {
    return NextResponse.json(
      { error: "Sincronização não configurada neste ambiente" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!safeCompare(authHeader, `Bearer ${config.storefrontSyncApiKey}`)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = syncCatalogPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await syncProductsFromHub(parsed.data.produtos);
  return NextResponse.json(result);
}
