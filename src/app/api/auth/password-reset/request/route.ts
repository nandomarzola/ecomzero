import { NextResponse, type NextRequest } from "next/server";
import { requestPasswordReset } from "@/lib/services/passwordResetService";
import { passwordResetRequestSchema } from "@/lib/validation/auth";
import {
  clientIp,
  isRateLimited,
  rateLimitKey,
  registerAttempt,
} from "@/lib/security/authRateLimit";

const RESET_REQUEST_MAX_PER_WINDOW = 5; // por IP / 15 min

const genericResponse = {
  success: true,
  message:
    "Se existir uma conta com esse e-mail, você receberá as instruções para redefinir a senha.",
};

export async function POST(request: NextRequest) {
  const ipKey = rateLimitKey("reset-request-ip", await clientIp());
  if (await isRateLimited(ipKey, RESET_REQUEST_MAX_PER_WINDOW)) {
    // Bloqueado: mesma resposta genérica (não vaza estado nem enumera e-mail)
    // e sem disparar e-mail.
    return NextResponse.json(genericResponse);
  }
  await registerAttempt(ipKey);

  const body = await request.json().catch(() => null);
  const parsed = passwordResetRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Informe um e-mail válido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await requestPasswordReset(parsed.data.email);
  } catch (error) {
    console.error("Falha ao processar recuperação de senha", error);
  }

  return NextResponse.json(genericResponse);
}
