"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cancelOrderInStorefront } from "@/lib/services/storefrontShippingAdminClient";
import { orderCancellationFormSchema } from "@/lib/validation/orderCancellation";

type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function cancelOrderAction(
  orderId: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = orderCancellationFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Informe um motivo válido para cancelar o pedido.",
    };
  }

  try {
    const result = await cancelOrderInStorefront(orderId, {
      ...parsed.data,
      requestedBy: session.user.email,
    });
    revalidatePath("/pedidos");
    revalidatePath(`/pedidos/${orderId}`);
    return {
      ok: true,
      message: result.refund
        ? "Pedido cancelado e pagamento estornado com sucesso."
        : "Pedido cancelado com sucesso.",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar o pedido.",
    };
  }
}
