import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { safeCompare } from "@/lib/security/safeCompare";
import { sendAdminLoginCodeEmail } from "@/lib/services/emailService";

const payloadSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().regex(/^\d{6}$/),
  challengeId: z.string().uuid(),
  requestId: z.string().min(1).max(100),
  expiresInMinutes: z.number().int().min(1).max(15),
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

  const { email, ...delivery } = parsed.data;
  const result = await sendAdminLoginCodeEmail({ ...delivery, to: email });
  if (result.status !== "sent") {
    return NextResponse.json(
      { error: "Não foi possível enviar o código" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
