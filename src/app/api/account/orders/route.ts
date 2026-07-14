import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrdersByUser } from "@/lib/services/accountService";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const orders = await getOrdersByUser(session.user.id);
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json(
      { error: "Erro inesperado ao listar pedidos" },
      { status: 500 },
    );
  }
}
