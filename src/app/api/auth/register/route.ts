import { NextResponse, type NextRequest } from "next/server";
import { AuthServiceError, registerUser } from "@/lib/services/authService";
import { registerSchema } from "@/lib/validation/auth";
import {
  clientIp,
  isRateLimited,
  rateLimitKey,
  registerAttempt,
} from "@/lib/security/authRateLimit";

const REGISTER_MAX_PER_WINDOW = 10; // criações por IP / 15 min

export async function POST(request: NextRequest) {
  const ipKey = rateLimitKey("registro-ip", await clientIp());
  if (await isRateLimited(ipKey, REGISTER_MAX_PER_WINDOW)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }
  await registerAttempt(ipKey);

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const user = await registerUser(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof AuthServiceError &&
      error.code === "EMAIL_ALREADY_REGISTERED"
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Não foi possível criar a conta" },
      { status: 500 },
    );
  }
}
