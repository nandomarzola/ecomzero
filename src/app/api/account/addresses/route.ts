import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createAddress,
  getAddressesByUser,
} from "@/lib/services/accountService";
import { createAddressSchema } from "@/lib/validation/account";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const addresses = await getAddressesByUser(session.user.id);
    return NextResponse.json({ addresses });
  } catch {
    return NextResponse.json(
      { error: "Erro inesperado ao listar endereços" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const address = await createAddress(session.user.id, parsed.data);
    return NextResponse.json(address, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro inesperado ao criar endereço" },
      { status: 500 },
    );
  }
}
