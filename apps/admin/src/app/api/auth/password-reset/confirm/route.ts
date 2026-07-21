import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  clientIp,
  isRateLimited,
  rateLimitKey,
  registerAttempt,
} from "@/lib/security/authRateLimit";
import {
  AdminPasswordResetError,
  resetAdminPassword,
} from "@/lib/services/adminPasswordResetService";
import { adminPasswordResetConfirmSchema } from "@/lib/validation/adminPasswordReset";

const MAX_CONFIRM_ATTEMPTS = 10;

export async function POST(request: NextRequest) {
  const parsed = adminPasswordResetConfirmSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const tokenFingerprint = createHash("sha256")
    .update(parsed.data.token, "utf8")
    .digest("hex")
    .slice(0, 32);
  const keys = [
    rateLimitKey("admin-password-reset-confirm-ip", await clientIp()),
    rateLimitKey("admin-password-reset-confirm-token", tokenFingerprint),
  ];
  if (
    (await Promise.all(keys.map((key) => isRateLimited(key, MAX_CONFIRM_ATTEMPTS)))).some(Boolean)
  ) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 },
    );
  }
  await Promise.all(keys.map(registerAttempt));

  try {
    await resetAdminPassword(parsed.data.token, parsed.data.newPassword);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AdminPasswordResetError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[admin-password-reset] falha ao redefinir senha", {
      tokenFingerprint,
      name: error instanceof Error ? error.name : "unknown_error",
    });
    return NextResponse.json(
      { error: "Não foi possível redefinir a senha agora." },
      { status: 500 },
    );
  }
}
