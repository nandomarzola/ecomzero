import { put } from "@vercel/blob";
import { config } from "@/lib/config";

// Upload de imagem de produto para o Vercel Blob. Devolve a URL pública
// ABSOLUTA (https://…blob.vercel-storage.com/…). A loja (ecomzero raiz) trata
// URLs absolutas nas imagens de produto além dos caminhos relativos legados
// de public/ (ver toImageUrl no storefront + remotePatterns do next.config).
export async function uploadProductImage(file: File): Promise<string> {
  if (!config.blobReadWriteToken) {
    throw new Error("Upload indisponível: BLOB_READ_WRITE_TOKEN não configurado.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
  const blob = await put(`produtos/${crypto.randomUUID()}-${safeName}`, file, {
    access: "public",
    token: config.blobReadWriteToken,
    addRandomSuffix: false,
  });

  return blob.url;
}
