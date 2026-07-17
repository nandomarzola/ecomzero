import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerNotifications } from "@/lib/services/customerNotificationService";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const result = await getCustomerNotifications(session.user.id);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Falha ao listar notificações do cliente", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível carregar suas notificações." },
      { status: 500 },
    );
  }
}
