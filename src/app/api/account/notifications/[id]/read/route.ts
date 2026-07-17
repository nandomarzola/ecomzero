import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { markCustomerNotificationAsRead } from "@/lib/services/customerNotificationService";

const notificationIdSchema = z.string().uuid();

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsedId = notificationIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Notificação inválida" }, { status: 400 });
  }

  try {
    const updated = await markCustomerNotificationAsRead(
      session.user.id,
      parsedId.data,
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Notificação não encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Falha ao marcar notificação como lida", {
      userId: session.user.id,
      notificationId: parsedId.data,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível atualizar a notificação." },
      { status: 500 },
    );
  }
}
