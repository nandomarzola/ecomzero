import { NextResponse, type NextRequest } from "next/server";
import { requireVerifiedAdmin } from "@/lib/security/adminAuthorization";
import { uploadImage } from "@/lib/blob";
import { assertRealImage, ImageValidationError } from "@/lib/imageValidation";

// Upload de mídia do catálogo no Vercel Blob, protegido por sessão de admin.
export async function POST(request: NextRequest) {
  if (!(await requireVerifiedAdmin()).ok) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }

  try {
    const requestedScope = request.nextUrl.searchParams.get("scope");
    const scope = requestedScope === "banners" || requestedScope === "categorias" || requestedScope === "branding"
      ? requestedScope
      : "produtos";
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "O arquivo deve ter no máximo 5 MB" }, { status: 400 });
    }
    await assertRealImage(file, { allowIco: scope === "branding" });
    const url = await uploadImage(file, scope);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Falha no upload de mídia do catálogo", {
      message: error instanceof Error ? error.message.slice(0, 300) : "erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível enviar o arquivo." },
      { status: 500 },
    );
  }
}
