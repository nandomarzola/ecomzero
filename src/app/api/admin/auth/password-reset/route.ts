import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { safeCompare } from "@/lib/security/safeCompare";
import { sendAdminPasswordResetEmail } from "@/lib/services/emailService";

const payloadSchema = z.object({
  adminUserId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
  resetUrl: z.string().url().max(1200),
  requestId: z.string().regex(/^[a-f0-9]{32}$/),
  expiresInMinutes: z.number().int().min(1).max(60),
});

export async function POST(request: NextRequest) {
  if (!config.storefrontSyncApiKey) {
    return NextResponse.json(
      { error: "Envio de e-mail não configurado" },
      { status: 503 },
    );
  }

  if (
    !safeCompare(
      request.headers.get("authorization"),
      `Bearer ${config.storefrontSyncApiKey}`,
    )
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const result = await sendAdminPasswordResetEmail({
    adminUserId: parsed.data.adminUserId,
    requestId: parsed.data.requestId,
    to: parsed.data.email,
    resetUrl: parsed.data.resetUrl,
    expiresInMinutes: parsed.data.expiresInMinutes,
  });
  if (result.status !== "sent") {
    return NextResponse.json(
      { error: "Não foi possível enviar o link" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
