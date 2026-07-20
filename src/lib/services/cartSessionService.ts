import { prisma } from "@/lib/db";
import { rotateCartSessionId } from "@/lib/session";

type PaidCartSessionAccess = {
  userId: string | null;
  hasGuestAccess: boolean;
};

type PaidCartSessionDependencies = {
  findOrder: (orderId: string) => Promise<{
    status: "draft" | "aguardando_pagamento" | "pago" | "cancelado";
    userId: string | null;
  } | null>;
  rotateSession: () => Promise<string>;
};

const defaultDependencies: PaidCartSessionDependencies = {
  findOrder: (orderId) =>
    prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, userId: true },
    }),
  rotateSession: rotateCartSessionId,
};

export async function rotatePaidCartSession(
  orderId: string,
  access: PaidCartSessionAccess,
  dependencies: PaidCartSessionDependencies = defaultDependencies,
): Promise<boolean> {
  const order = await dependencies.findOrder(orderId);
  if (!order || order.status !== "pago") return false;

  const belongsToUser = Boolean(
    access.userId && order.userId === access.userId,
  );
  if (!belongsToUser && !access.hasGuestAccess) return false;

  await dependencies.rotateSession();
  return true;
}
