import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, MapPin, Package } from "lucide-react";
import ShipmentActions from "@/components/pedidos/ShipmentActions";
import { getAdminOrderDetails } from "@/lib/services/shippingFulfillmentAdminService";

export const dynamic = "force-dynamic";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const orderStatusLabel = {
  draft: "Carrinho",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pagamento confirmado",
  cancelado: "Cancelado",
};

export default async function AdminOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrderDetails(id);
  if (!order || order.status === "draft") notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/pedidos" className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Voltar aos pedidos</Link>
          <h2 className="font-display mt-2 text-2xl font-bold">Pedido #{order.id.slice(0, 8)}</h2>
          <p className="mt-1 text-xs text-white/35">Criado em {order.createdAt.toLocaleString("pt-BR")}</p>
        </div>
        <span className="rounded-full border border-[#A9EC17]/20 bg-[#A9EC17]/5 px-3 py-1 text-xs text-[#D9FF87]">{orderStatusLabel[order.status]}</span>
      </div>

      {order.status === "pago" ? <ShipmentActions orderId={order.id} shipment={order.shipment} /> : (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4 text-sm text-amber-200">A expedição será liberada quando o pagamento for confirmado.</p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-center gap-2"><Package className="h-4 w-4 text-[#A9EC17]" /><h3 className="font-display font-bold">Itens do pedido</h3></div>
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white">
                  <Image src={item.variant.product.imagem} alt={item.variant.product.nome} fill sizes="64px" className="object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white/85">{item.variant.product.nome}</p>
                  <p className="mt-1 text-xs text-white/40">{item.variant.label} · Quantidade {item.quantidade}</p>
                </div>
                <p className="text-sm font-semibold">{money(Number(item.precoUnitario) * item.quantidade)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-white/[0.08] pt-4 text-sm">
            <div className="flex justify-between text-white/45"><dt>Subtotal</dt><dd>{money(Number(order.subtotal))}</dd></div>
            <div className="flex justify-between text-white/45"><dt>Frete</dt><dd>{money(Number(order.valorFrete))}</dd></div>
            <div className="flex justify-between pt-2 text-base font-bold"><dt>Total</dt><dd className="text-[#A9EC17]">{money(Number(order.total))}</dd></div>
          </dl>
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#A9EC17]" /><h3 className="font-display font-bold">Cliente e entrega</h3></div>
            <div className="mt-4 space-y-1 text-sm leading-6 text-white/55">
              <p className="font-semibold text-white/80">{order.nomeCliente ?? "—"}</p>
              <p>{order.emailCliente ?? "—"}</p>
              <p>{order.telefoneCliente ?? "—"}</p>
              <p className="pt-2">{order.logradouro}, {order.numero}{order.complemento ? `, ${order.complemento}` : ""}</p>
              <p>{order.bairro} · {order.cidade}/{order.uf}</p>
              <p>CEP {order.cepDestino}</p>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#A9EC17]" /><h3 className="font-display font-bold">Pagamento</h3></div>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs text-white/35">Status Mercado Pago</dt><dd className="mt-1 text-white/70">{order.mercadoPagoPaymentStatus ?? "Não informado"}</dd></div>
              <div><dt className="text-xs text-white/35">ID do pagamento</dt><dd className="mt-1 break-all font-mono text-xs text-white/55">{order.mercadoPagoPaymentId ?? "—"}</dd></div>
              {order.pagoEm ? <div><dt className="text-xs text-white/35">Confirmado em</dt><dd className="mt-1 text-white/70">{order.pagoEm.toLocaleString("pt-BR")}</dd></div> : null}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
