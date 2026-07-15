import { prisma } from "@/lib/db";

export type RecentOrder = { id: string; customer: string; email: string | null; status: "draft" | "aguardando_pagamento" | "pago" | "cancelado"; shipmentStatus: string | null; total: number; createdAt: string };

export async function getDashboardData() {
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const [products, customers, coupons, banners, ordersToday, revenue, recentOrders] = await Promise.all([
    prisma.product.count(), prisma.user.count(), prisma.coupon.count({ where: { ativo: true } }), prisma.banner.count({ where: { ativo: true } }),
    prisma.order.count({ where: { createdAt: { gte: startToday }, status: { not: "draft" } } }),
    prisma.order.aggregate({ where: { status: "pago" }, _sum: { total: true } }),
    prisma.order.findMany({ where: { status: { not: "draft" } }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, nomeCliente: true, emailCliente: true, status: true, total: true, createdAt: true, shipment: { select: { status: true } } } }),
  ]);
  return {
    products, customers, coupons, banners, ordersToday,
    revenue: Number(revenue._sum.total ?? 0),
    recentOrders: recentOrders.map((order) => ({ id: order.id, customer: order.nomeCliente ?? "Cliente não informado", email: order.emailCliente, status: order.status, shipmentStatus: order.shipment?.status ?? null, total: Number(order.total), createdAt: order.createdAt.toISOString() })),
  };
}

export async function listOrders(): Promise<RecentOrder[]> {
  const orders = await prisma.order.findMany({ where: { status: { not: "draft" } }, orderBy: { createdAt: "desc" }, select: { id: true, nomeCliente: true, emailCliente: true, status: true, total: true, createdAt: true, shipment: { select: { status: true } } } });
  return orders.map((order) => ({ id: order.id, customer: order.nomeCliente ?? "Cliente não informado", email: order.emailCliente, status: order.status, shipmentStatus: order.shipment?.status ?? null, total: Number(order.total), createdAt: order.createdAt.toISOString() }));
}
