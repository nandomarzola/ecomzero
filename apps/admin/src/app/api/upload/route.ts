import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { uploadProductImage } from "@/lib/blob";

// Upload de imagem de produto → Vercel Blob. Protegido por sessão de admin.
// O ImageUploader (client) chama isto a cada arquivo e guarda a URL retornada.
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
    const url = await uploadProductImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no upload" },
      { status: 500 },
    );
  }
}
