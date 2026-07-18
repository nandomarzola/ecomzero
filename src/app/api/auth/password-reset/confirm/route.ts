import { NextResponse, type NextRequest } from "next/server";
import {
  PasswordResetServiceError,
  resetPassword,
} from "@/lib/services/passwordResetService";
import { passwordResetConfirmSchema } from "@/lib/validation/auth";
import {
  clientIp,
  isRateLimited,
  rateLimitKey,
  registerAttempt,
} from "@/lib/security/authRateLimit";

const RESET_CONFIRM_MAX_PER_WINDOW = 10; // por IP / 15 min

export async function POST(request: NextRequest) {
  const ipKey = rateLimitKey("reset-confirm-ip", await clientIp());
  if (await isRateLimited(ipKey, RESET_CONFIRM_MAX_PER_WINDOW)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }
  await registerAttempt(ipKey);

  const body = await request.json().catch(() => null);
  const parsed = passwordResetConfirmSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.senhaNova);
    return NextResponse.json({
      success: true,
      message: "Senha redefinida. Entre novamente com a nova senha.",
    });
  } catch (error) {
    if (error instanceof PasswordResetServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Não foi possível redefinir a senha agora" },
      { status: 500 },
    );
  }
}
