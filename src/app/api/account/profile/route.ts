import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  AccountServiceError,
  getProfile,
  updateProfile,
} from "@/lib/services/accountService";
import { updateProfileSchema } from "@/lib/validation/account";

function handleProfileError(error: unknown) {
  if (
    error instanceof AccountServiceError &&
    error.code === "USER_NOT_FOUND"
  ) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(
    { error: "Erro inesperado ao acessar perfil" },
    { status: 500 },
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getProfile(session.user.id));
  } catch (error) {
    return handleProfileError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await updateProfile(session.user.id, parsed.data));
  } catch (error) {
    return handleProfileError(error);
  }
}
