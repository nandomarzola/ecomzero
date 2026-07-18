import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  AccountServiceError,
  changePassword,
} from "@/lib/services/accountService";
import { changePasswordSchema } from "@/lib/validation/account";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await changePassword(session.user.id, parsed.data);
    return NextResponse.json({
      success: true,
      sessionInvalidated: true,
      message: "Senha alterada. Entre novamente em todos os dispositivos.",
    });
  } catch (error) {
    if (
      error instanceof AccountServiceError &&
      error.code === "CURRENT_PASSWORD_INCORRECT"
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Erro inesperado ao alterar senha" },
      { status: 500 },
    );
  }
}
