import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { safeCompare } from "@/lib/security/safeCompare";
import {
  cancelOrder,
  OrderCancellationError,
} from "@/lib/services/orderCancellationService";
import { orderCancellationSchema } from "@/lib/validation/orderCancellation";

const orderIdSchema = z.string().uuid();

function authorized(request: NextRequest) {
  return Boolean(
    config.storefrontSyncApiKey &&
      safeCompare(
        request.headers.get("authorization"),
        `Bearer ${config.storefrontSyncApiKey}`,
      ),
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsedId = orderIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const parsed = orderCancellationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Informe um motivo válido para cancelar o pedido.",
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await cancelOrder(parsedId.data, parsed.data));
  } catch (error) {
    if (error instanceof OrderCancellationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("Falha inesperada ao cancelar pedido", {
      orderId: parsedId.data,
      name: error instanceof Error ? error.name : null,
      message: error instanceof Error ? error.message.slice(0, 500) : null,
    });
    return NextResponse.json(
      { error: "Não foi possível cancelar o pedido." },
      { status: 500 },
    );
  }
}
