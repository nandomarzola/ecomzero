import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  ReviewImageError,
  uploadReviewImage,
} from "@/lib/services/reviewImageService";

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
    if (error instanceof ReviewImageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Falha no upload de foto de avaliação", {
      userId: session.user.id,
      message: error instanceof Error ? error.message.slice(0, 300) : "erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível enviar a foto." },
      { status: 400 },
    );
  }
}
