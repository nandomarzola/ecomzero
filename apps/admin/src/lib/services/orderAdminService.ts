import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  ORDERS_PAGE_SIZE,
  type OrderFilterId,
  type OrderPeriodId,
} from "@/lib/orders/filters";

// Única camada que toca Prisma para a tela de Pedidos do admin. Traduz os
// filtros de UI (aba + período + busca) em cláusulas Prisma e mapeia o retorno
// (Decimal → number, Date → ISO string) para o domínio consumido pela UI.

export type OrderRow = {
  id: string;
  customer: string;
  email: string | null;
  createdAt: string; // ISO
  paymentMethod: string | null; // não persistido hoje — sempre null (ver status.ts)
  total: number;
  status: string;
  shippingMode: string;
  shippingProvider: string | null;
  shippingService: string | null;
  shippingAmountCharged: number;
  labelStatus: string;
  shipmentStatus: string | null;
  shipmentError: string | null;
  hasMelhorEnvioLabel: boolean;
};

export type OrdersSummary = {
  aguardando: number;
  geradas: number;
  manuais: number;
  problemas: number;
};

export type OrdersPage = {
  rows: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Mapeamento acordado com o dono do produto:
//   pagos     → status "pago"
//   nao-pagos → status "aguardando_pagamento"
//   feitos    → todo pedido que saiu do carrinho (status ≠ draft)
//   nao-feitos→ status "cancelado"
//   todos     → todo pedido que saiu do carrinho (mesmo conjunto de "feitos")
function statusWhere(filter: OrderFilterId): Prisma.OrderWhereInput {
  switch (filter) {
    case "aguardando-pagamento":
      return { status: "aguardando_pagamento" };
    case "aguardando-etiqueta":
      return {
        status: "pago",
        OR: [
          { shipment: { is: null } },
          {
            shipment: {
              is: {
                labelStatus: {
                  in: [
                    "awaiting_shipping_data",
                    "awaiting_fiscal_document",
                    "awaiting_invoice",
                    "ready_to_purchase",
                    "processing",
                  ],
                },
              },
            },
          },
        ],
      };
    case "etiqueta-gerada":
      return {
        shipment: {
          is: { labelStatus: { in: ["generated", "printed"] } },
        },
      };
    case "frete-gratis":
      return {
        status: "pago",
        shippingMode: {
          in: ["free_shipping_coupon", "free_shipping_threshold"],
        },
      };
    case "com-problema":
      return {
        shipment: {
          is: { labelStatus: { in: ["insufficient_balance", "error"] } },
        },
      };
    case "postados":
      return { shipment: { is: { labelStatus: "posted" } } };
    case "em-transito":
      return { shipment: { is: { labelStatus: "in_transit" } } };
    case "entregues":
      return { shipment: { is: { labelStatus: "delivered" } } };
    case "todos":
    default:
      return { status: { not: "draft" } };
  }
}

// Início do intervalo do período selecionado (undefined = todo o histórico).
function periodStart(period: OrderPeriodId): Date | undefined {
  const now = new Date();
  switch (period) {
    case "hoje": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "tudo":
    default:
      return undefined;
  }
}

function dateWhere(period: OrderPeriodId): Prisma.OrderWhereInput {
  const gte = periodStart(period);
  return gte ? { createdAt: { gte } } : {};
}

function searchWhere(search: string | undefined): Prisma.OrderWhereInput {
  const query = search?.trim();
  if (!query) return {};
  // Busca por código exibido (#abcd1234 → trecho do uuid), nome ou e-mail.
  const codeQuery = query.replace(/^#/, "");
  return {
    OR: [
      { id: { contains: codeQuery, mode: "insensitive" } },
      { nomeCliente: { contains: query, mode: "insensitive" } },
      { emailCliente: { contains: query, mode: "insensitive" } },
    ],
  };
}

export async function getOrdersSummary(period: OrderPeriodId): Promise<OrdersSummary> {
  const dateFilter = dateWhere(period);
  const [aguardando, geradas, manuais, problemas] = await Promise.all([
    prisma.order.count({
      where: { ...dateFilter, ...statusWhere("aguardando-etiqueta") },
    }),
    prisma.order.count({
      where: {
        ...dateFilter,
        shipment: {
          is: {
            labelStatus: {
              in: ["generated", "printed", "posted", "in_transit", "delivered"],
            },
          },
        },
      },
    }),
    prisma.order.count({
      where: { ...dateFilter, ...statusWhere("frete-gratis") },
    }),
    prisma.order.count({
      where: { ...dateFilter, ...statusWhere("com-problema") },
    }),
  ]);

  return { aguardando, geradas, manuais, problemas };
}

export async function listOrdersPaged(params: {
  filter: OrderFilterId;
  period: OrderPeriodId;
  search?: string;
  page: number;
}): Promise<OrdersPage> {
  const pageSize = ORDERS_PAGE_SIZE;
  const where: Prisma.OrderWhereInput = {
    AND: [
      statusWhere(params.filter),
      dateWhere(params.period),
      searchWhere(params.search),
    ],
  };

  const total = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, params.page), totalPages);

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      nomeCliente: true,
      emailCliente: true,
      status: true,
      total: true,
      createdAt: true,
      shippingMode: true,
      shippingProvider: true,
      shippingService: true,
      shippingAmountCharged: true,
      shipment: {
        select: {
          status: true,
          labelStatus: true,
          ultimoErro: true,
          melhorEnvioId: true,
        },
      },
    },
  });

  return {
    rows: orders.map((order) => ({
      id: order.id,
      customer: order.nomeCliente ?? "Cliente não informado",
      email: order.emailCliente,
      createdAt: order.createdAt.toISOString(),
      paymentMethod: null,
      total: Number(order.total),
      status: order.status,
      shippingMode: order.shippingMode,
      shippingProvider: order.shippingProvider,
      shippingService: order.shippingService,
      shippingAmountCharged: Number(order.shippingAmountCharged),
      labelStatus:
        order.shipment?.labelStatus ??
        (order.status === "aguardando_pagamento"
          ? "awaiting_payment"
          : order.status === "pago"
            ? "awaiting_shipping_data"
            : order.status === "cancelado"
              ? "canceled"
              : "not_applicable"),
      shipmentStatus: order.shipment?.status ?? null,
      shipmentError: order.shipment?.ultimoErro ?? null,
      hasMelhorEnvioLabel: Boolean(order.shipment?.melhorEnvioId),
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}
