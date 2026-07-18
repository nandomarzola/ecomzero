import { createMetaCatalogErrorResponse } from "@/lib/metaCatalogDomain";
import { getMetaCatalogFeedResponse } from "@/lib/services/metaCatalogService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return await getMetaCatalogFeedResponse(request);
  } catch (error) {
    console.error("Falha ao gerar feed do Catálogo da Meta", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return createMetaCatalogErrorResponse("Não foi possível gerar o catálogo.");
  }
}
