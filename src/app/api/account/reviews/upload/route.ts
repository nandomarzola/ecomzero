import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { uploadReviewImage } from "@/lib/services/reviewImageService";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecione uma foto." }, { status: 400 });
  }

  try {
    const url = await uploadReviewImage(file);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no upload." },
      { status: 400 },
    );
  }
}
