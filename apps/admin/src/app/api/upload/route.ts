import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/blob";

// Upload de mídia do catálogo no Vercel Blob, protegido por sessão de admin.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
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
    const isIcon = file.name.toLowerCase().endsWith(".ico");
    if (!file.type.startsWith("image/") && !(scope === "branding" && isIcon)) {
      return NextResponse.json({ error: "Formato de imagem inválido" }, { status: 400 });
    }
    const url = await uploadImage(file, scope);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no upload" },
      { status: 500 },
    );
  }
}
