import { NextResponse, type NextRequest } from "next/server";
import {
  clientIp,
  isRateLimited,
  rateLimitKey,
  registerAttempt,
} from "@/lib/security/authRateLimit";
import { requestAdminPasswordReset } from "@/lib/services/adminPasswordResetService";
import { adminPasswordResetRequestSchema } from "@/lib/validation/adminPasswordReset";

const MAX_REQUESTS_PER_IP = 5;
const MAX_REQUESTS_PER_EMAIL = 3;
const genericResponse = {
  success: true,
  message:
    "Se existir uma conta administrativa com esse e-mail, você receberá as instruções para redefinir a senha.",
};

export async function POST(request: NextRequest) {
  const parsed = adminPasswordResetRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Informe um e-mail válido" },
      { status: 400 },
    );
  }

  const keys = [
    rateLimitKey("admin-password-reset-request-ip", await clientIp()),
    rateLimitKey("admin-password-reset-request-email", parsed.data.email),
  ];
  const limited = await Promise.all([
    isRateLimited(keys[0], MAX_REQUESTS_PER_IP),
    isRateLimited(keys[1], MAX_REQUESTS_PER_EMAIL),
  ]);
  if (limited.some(Boolean)) return NextResponse.json(genericResponse);

  await Promise.all(keys.map(registerAttempt));
  try {
    await requestAdminPasswordReset(parsed.data.email);
  } catch (error) {
    console.error("[admin-password-reset] falha ao processar solicitação", {
      name: error instanceof Error ? error.name : "unknown_error",
    });
  }

  return NextResponse.json(genericResponse);
}
