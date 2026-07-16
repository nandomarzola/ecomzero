import { prisma } from "@/lib/db";

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type DashboardPeriod = {
  id: "7d" | "30d";
  label: string;
  points: { label: string; value: number }[];
  revenue: number;
  averageTicket: number;
  conversion: number;
  paidOrders: number;
};

export type DashboardData = {
  products: number;
  customers: number;
  ordersToday: number;
  paidOrdersToday: number;
  revenueToday: number;
  periods: DashboardPeriod[];
  recentOrders: {
    id: string;
    customer: string;
    status: string;
    shipmentStatus: string | null;
    labelStatus: string | null;
    total: number;
    createdAt: string;
  }[];
  topProducts: {
    id: string;
    name: string;
    quantity: number;
    value: number;
  }[];
};

function calendarDateAt(date: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
}

function calendarKey(date: CalendarDate) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function calendarKeyAt(date: Date, timeZone: string) {
  return calendarKey(calendarDateAt(date, timeZone));
}

function addCalendarDays(date: CalendarDate, amount: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + amount));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const displayedAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );

  return displayedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function startOfCalendarDay(date: CalendarDate, timeZone: string) {
  const midnightAsUtc = Date.UTC(date.year, date.month - 1, date.day);
  let result = midnightAsUtc - timeZoneOffsetMs(new Date(midnightAsUtc), timeZone);
  result = midnightAsUtc - timeZoneOffsetMs(new Date(result), timeZone);
  return new Date(result);
}

function displayDate(date: CalendarDate) {
  return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}`;
}

function moneyTotal(orders: { total: unknown }[]) {
  return orders.reduce((total, order) => total + Number(order.total), 0);
}

export async function getDashboardData(): Promise<DashboardData> {
  const settings = await prisma.storeSettings.findUnique({
    where: { id: "singleton" },
    select: { fusoHorario: true },
  });
  const timeZone = settings?.fusoHorario || DEFAULT_TIME_ZONE;
  const today = calendarDateAt(new Date(), timeZone);
  const tomorrow = addCalendarDays(today, 1);
  const firstDay30 = addCalendarDays(today, -29);
  const periodStart = startOfCalendarDay(firstDay30, timeZone);
  const periodEnd = startOfCalendarDay(tomorrow, timeZone);

  const [products, customers, paidOrders, madeOrders, recentOrders, soldItems] =
    await Promise.all([
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.findMany({
        where: {
          status: "pago",
          OR: [
            { pagoEm: { gte: periodStart, lt: periodEnd } },
            {
              pagoEm: null,
              createdAt: { gte: periodStart, lt: periodEnd },
            },
          ],
        },
        select: { total: true, pagoEm: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: {
          status: { not: "draft" },
          createdAt: { gte: periodStart, lt: periodEnd },
        },
        select: { status: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { status: "pago" },
        orderBy: [
          { pagoEm: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        take: 5,
        select: {
          id: true,
          nomeCliente: true,
          status: true,
          total: true,
          pagoEm: true,
          createdAt: true,
          shipment: { select: { status: true } },
        },
      }),
      prisma.orderItem.findMany({
        where: { order: { status: "pago" } },
        select: {
          quantidade: true,
          precoUnitario: true,
          variant: {
            select: { product: { select: { id: true, nome: true } } },
          },
        },
      }),
    ]);

  const paidByDay = new Map<string, { count: number; revenue: number }>();
  for (const order of paidOrders) {
    const key = calendarKeyAt(order.pagoEm ?? order.createdAt, timeZone);
    const current = paidByDay.get(key) ?? { count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += Number(order.total);
    paidByDay.set(key, current);
  }

  const madeByDay = new Map<string, { count: number; paid: number }>();
  for (const order of madeOrders) {
    const key = calendarKeyAt(order.createdAt, timeZone);
    const current = madeByDay.get(key) ?? { count: 0, paid: 0 };
    current.count += 1;
    if (order.status === "pago") current.paid += 1;
    madeByDay.set(key, current);
  }

  const createPeriod = (days: 7 | 30): DashboardPeriod => {
    const calendarDays = Array.from({ length: days }, (_, index) =>
      addCalendarDays(today, index - days + 1),
    );
    const periodPaidOrders = calendarDays.reduce(
      (total, day) => total + (paidByDay.get(calendarKey(day))?.count ?? 0),
      0,
    );
    const revenue = calendarDays.reduce(
      (total, day) => total + (paidByDay.get(calendarKey(day))?.revenue ?? 0),
      0,
    );
    const created = calendarDays.reduce(
      (total, day) => total + (madeByDay.get(calendarKey(day))?.count ?? 0),
      0,
    );
    const createdAndPaid = calendarDays.reduce(
      (total, day) => total + (madeByDay.get(calendarKey(day))?.paid ?? 0),
      0,
    );

    return {
      id: days === 7 ? "7d" : "30d",
      label: days === 7 ? "Últimos 7 dias" : "Últimos 30 dias",
      points: calendarDays.map((day) => ({
        label: displayDate(day),
        value: paidByDay.get(calendarKey(day))?.revenue ?? 0,
      })),
      revenue,
      averageTicket: periodPaidOrders > 0 ? revenue / periodPaidOrders : 0,
      conversion: created > 0 ? (createdAndPaid / created) * 100 : 0,
      paidOrders: periodPaidOrders,
    };
  };

  const productSales = new Map<
    string,
    { id: string; name: string; quantity: number; value: number }
  >();
  for (const item of soldItems) {
    const product = item.variant.product;
    const current = productSales.get(product.id) ?? {
      id: product.id,
      name: product.nome,
      quantity: 0,
      value: 0,
    };
    current.quantity += item.quantidade;
    current.value += item.quantidade * Number(item.precoUnitario);
    productSales.set(product.id, current);
  }

  const todayKey = calendarKey(today);
  const paidToday = paidOrders.filter(
    (order) => calendarKeyAt(order.pagoEm ?? order.createdAt, timeZone) === todayKey,
  );
  const ordersToday = madeOrders.filter(
    (order) => calendarKeyAt(order.createdAt, timeZone) === todayKey,
  ).length;

  return {
    products,
    customers,
    ordersToday,
    paidOrdersToday: paidToday.length,
    revenueToday: moneyTotal(paidToday),
    periods: [createPeriod(7), createPeriod(30)],
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      customer: order.nomeCliente ?? "Cliente não informado",
      status: order.status,
      shipmentStatus: order.shipment?.status ?? null,
      labelStatus: null,
      total: Number(order.total),
      createdAt: (order.pagoEm ?? order.createdAt).toISOString(),
    })),
    topProducts: [...productSales.values()]
      .sort((a, b) => b.quantity - a.quantity || b.value - a.value)
      .slice(0, 5),
  };
}
