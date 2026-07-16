import { put } from "@vercel/blob";
import { config } from "@/lib/config";

// Upload de mídia do catálogo para o Vercel Blob, devolvendo a URL pública.
export async function uploadImage(file: File, folder: "produtos" | "banners" | "categorias" | "branding"): Promise<string> {
  if (!config.blobReadWriteToken) {
    throw new Error("Upload indisponível: BLOB_READ_WRITE_TOKEN não configurado.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
  const blob = await put(`${folder}/${crypto.randomUUID()}-${safeName}`, file, {
    access: "public",
    token: config.blobReadWriteToken,
    addRandomSuffix: false,
  });

  return blob.url;
}

export async function uploadProductImage(file: File): Promise<string> {
  return uploadImage(file, "produtos");
}
