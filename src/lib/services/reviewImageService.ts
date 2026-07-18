import { put } from "@vercel/blob";
import { config } from "@/lib/config";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Erro de validação com mensagem segura para exibir ao cliente. */
export class ReviewImageError extends Error {}

function hasValidSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export async function uploadReviewImage(file: File): Promise<string> {
  if (!config.blobReadWriteToken) {
    throw new ReviewImageError("Upload de fotos indisponível no momento.");
  }
  if (!allowedMimeTypes.has(file.type)) {
    throw new ReviewImageError("Envie uma imagem JPG, PNG ou WebP.");
  }
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new ReviewImageError("Cada foto deve ter no máximo 5 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(bytes, file.type)) {
    throw new ReviewImageError(
      "O conteúdo do arquivo não corresponde a uma imagem válida.",
    );
  }

  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const blob = await put(
    `avaliacoes/${crypto.randomUUID()}.${extension}`,
    file,
    {
      access: "public",
      token: config.blobReadWriteToken,
      addRandomSuffix: false,
      contentType: file.type,
    },
  );
  return blob.url;
}
