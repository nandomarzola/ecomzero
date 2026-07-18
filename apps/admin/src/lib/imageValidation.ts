const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function matchesSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (mime === "image/webp") {
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
  return false;
}

function isIco(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x01 &&
    bytes[3] === 0x00
  );
}

export class ImageValidationError extends Error {}

/**
 * Valida o tipo REAL do arquivo por magic bytes (não confia no Content-Type do
 * cliente). Rejeita SVG e qualquer não-imagem. `allowIco` libera .ico só para
 * o branding (favicon).
 */
export async function assertRealImage(
  file: File,
  opts: { allowIco: boolean },
): Promise<void> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const okImage = IMAGE_MIME.has(file.type) && matchesSignature(bytes, file.type);
  const okIco = opts.allowIco && isIco(bytes);
  if (!okImage && !okIco) {
    throw new ImageValidationError(
      opts.allowIco
        ? "Envie uma imagem JPG, PNG, WebP ou ICO."
        : "Envie uma imagem JPG, PNG ou WebP.",
    );
  }
}
