import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PackageOpen, ReceiptText } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrdersByUser } from "@/lib/services/accountService";

export const metadata: Metadata = {
  title: "Meus pedidos",
};

const statusDetails = {
  aguardando_pagamento: {
    label: "Aguardando pagamento",
    className: "border-amber-300/25 bg-amber-300/[0.08] text-amber-200",
  },
  pago: {
    label: "Pagamento confirmado",
    className: "border-[#A9EC17]/25 bg-[#A9EC17]/[0.08] text-[#D5FF7B]",
  },
  cancelado: {
    label: "Cancelado",
    className: "border-red-300/25 bg-red-300/[0.08] text-red-200",
  },
} as const;

const formatPrice = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);

export default async function AccountOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orders = await getOrdersByUser(session.user.id);

  return (
    <section aria-labelledby="orders-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A9EC17]">
            Histórico
          </p>
          <h2 id="orders-title" className="font-display mt-1 text-2xl font-extrabold text-white">
            Meus pedidos
          </h2>
        </div>
        {orders.length > 0 && (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/45">
            {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="mt-5 rounded-xl border border-white/[0.1] bg-[#0D0D0D] px-6 py-14 text-center">
          <PackageOpen className="mx-auto h-12 w-12 text-[#A9EC17]" strokeWidth={1.5} />
          <h3 className="font-display mt-5 text-lg font-bold text-white">
            Nenhum pedido por aqui
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/45">
            Quando você finalizar uma compra, ela aparecerá nesta área.
          </p>
          <Link
            href="/"
            className="font-display mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[#A9EC17] px-6 text-xs font-extrabold uppercase text-black transition hover:bg-[#B8FF28]"
          >
            Ver produtos
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {orders.map((order) => {
            const status = statusDetails[order.status];
            const action =
              order.status === "aguardando_pagamento"
                ? { href: `/checkout/pagamento/${order.id}`, label: "Continuar pagamento" }
                : order.status === "pago"
                  ? { href: `/pedido/${order.id}/sucesso`, label: "Ver confirmação" }
                  : { href: `/pedido/${order.id}/falha`, label: "Ver pedido" };

            return (
              <article key={order.id} className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#0D0D0D]">
                <header className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-[#A9EC17]">
                      <ReceiptText className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-display text-xs font-bold uppercase text-white">
                        Pedido #{order.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-[10px] text-white/40">
                        Realizado em {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                </header>

                <div className="p-5">
                  <ul className="space-y-3">
                    {order.produtos.map((product, index) => (
                      <li key={`${product.nome}-${index}`} className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white">
                          <Image
                            src={product.imagem}
                            alt={product.nome}
                            fill
                            sizes="56px"
                            className="object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-xs font-semibold leading-5 text-white/80">
                            {product.nome}
                          </p>
                          <p className="mt-0.5 text-[10px] text-white/40">
                            Quantidade: {product.quantidade}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <footer className="mt-5 flex flex-col gap-4 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-white/40">Total do pedido</p>
                      <strong className="font-display mt-1 block text-xl font-extrabold text-[#A9EC17]">
                        {formatPrice(order.total)}
                      </strong>
                    </div>
                    <Link
                      href={action.href}
                      className="font-display inline-flex min-h-11 items-center justify-center rounded-md border border-[#A9EC17]/60 px-5 text-[10px] font-extrabold uppercase text-[#A9EC17] transition hover:bg-[#A9EC17] hover:text-black"
                    >
                      {action.label}
                    </Link>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
