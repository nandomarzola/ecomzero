import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, MapPin, ReceiptText, Truck } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrderByUser } from "@/lib/services/accountService";

export const metadata: Metadata = { title: "Detalhes do pedido" };

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const shipmentStatusLabel: Record<string, string> = {
  creating: "Preparando envio",
  pending: "Preparando envio",
  released: "Etiqueta comprada",
  generated: "Pronto para postagem",
  received: "Recebido no ponto de postagem",
  posted: "Em trânsito",
  delivered: "Entregue",
  undelivered: "Não foi possível entregar",
  cancelled: "Envio cancelado",
  canceled: "Envio cancelado",
  paused: "Entrega pausada",
  suspended: "Entrega suspensa",
};

function progressIndex(status: string | null | undefined) {
  if (status === "delivered") return 3;
  if (status === "posted" || status === "received" || status === "undelivered" || status === "paused" || status === "suspended") return 2;
  if (status) return 1;
  return 1;
}

export default async function AccountOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const order = await getOrderByUser(session.user.id, id);
  if (!order) notFound();

  const shipmentStatus = order.shipment?.status;
  const currentStep = progressIndex(shipmentStatus);
  const steps = [
    { label: "Pagamento", detail: order.pagoEm ? `Confirmado em ${order.pagoEm.toLocaleDateString("pt-BR")}` : "Aguardando confirmação" },
    { label: "Preparação", detail: order.shipment ? shipmentStatusLabel[order.shipment.status] ?? "Preparando envio" : "Separando seu pedido" },
    { label: "Transporte", detail: order.shipment?.codigoRastreio ? `Rastreio ${order.shipment.codigoRastreio}` : "Aguardando postagem" },
    { label: "Entrega", detail: order.shipment?.entregueEm ? `Entregue em ${order.shipment.entregueEm.toLocaleDateString("pt-BR")}` : "Destino final" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/conta/pedidos" className="inline-flex items-center gap-1 text-xs text-white/40 transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Voltar aos pedidos</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-color)]">Acompanhamento</p>
            <h2 className="font-display mt-1 text-2xl font-extrabold text-white">Pedido #{order.id.slice(0, 8)}</h2>
            <p className="mt-1 text-xs text-white/40">Realizado em {order.createdAt.toLocaleDateString("pt-BR")}</p>
          </div>
          <span className="rounded-full border border-[var(--brand-color)]/25 bg-[var(--brand-color)]/[0.08] px-3 py-1 text-xs font-semibold text-[#D5FF7B]">
            {order.status === "aguardando_pagamento" ? "Aguardando pagamento" : order.status === "cancelado" ? "Cancelado" : shipmentStatus ? shipmentStatusLabel[shipmentStatus] ?? shipmentStatus : "Pagamento confirmado"}
          </span>
        </div>
      </div>

      {order.status === "pago" ? (
        <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-4">
            {steps.map((step, index) => {
              const complete = index <= currentStep;
              return (
                <div key={step.label} className="relative">
                  {index < steps.length - 1 ? <span className={`absolute left-5 top-5 hidden h-px w-[calc(100%-1.5rem)] sm:block ${index < currentStep ? "bg-[var(--brand-color)]" : "bg-white/10"}`} /> : null}
                  <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border ${complete ? "border-[var(--brand-color)] bg-[var(--brand-color)] text-black" : "border-white/15 bg-[#151515] text-white/30"}`}>
                    {complete ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <p className={`mt-3 text-xs font-bold ${complete ? "text-white" : "text-white/35"}`}>{step.label}</p>
                  <p className="mt-1 text-[10px] leading-4 text-white/35">{step.detail}</p>
                </div>
              );
            })}
          </div>
          {order.shipment?.urlRastreio ? (
            <a href={order.shipment.urlRastreio} target="_blank" rel="noreferrer" className="font-display mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--brand-color)] px-5 text-[10px] font-extrabold uppercase text-black transition hover:bg-[#B8FF28]">
              Acompanhar entrega <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <p className="mt-6 rounded-lg border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs leading-5 text-white/40">O código de rastreio aparecerá aqui depois que a transportadora receber a postagem.</p>
          )}
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5">
          <div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-[var(--brand-color)]" /><h3 className="font-display text-sm font-bold text-white">Itens e valores</h3></div>
          <ul className="mt-4 divide-y divide-white/[0.07]">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-4 first:pt-0">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white"><Image src={item.imagem} alt={item.nome} fill sizes="64px" className="object-contain" /></div>
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold leading-5 text-white/80">{item.nome}</p><p className="mt-1 text-[10px] text-white/40">{item.variante} · Quantidade {item.quantidade}</p></div>
                <p className="text-xs font-semibold text-white/70">{money(item.precoUnitario * item.quantidade)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-white/[0.08] pt-4 text-xs">
            <div className="flex justify-between text-white/40"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            <div className="flex justify-between text-white/40"><dt>Frete</dt><dd>{money(order.valorFrete)}</dd></div>
            <div className="flex justify-between pt-2 text-base font-extrabold text-white"><dt>Total</dt><dd className="text-[var(--brand-color)]">{money(order.total)}</dd></div>
          </dl>
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--brand-color)]" /><h3 className="font-display text-sm font-bold text-white">Endereço de entrega</h3></div>
            <div className="mt-4 text-xs leading-6 text-white/50"><p className="font-semibold text-white/75">{order.nomeCliente}</p><p>{order.logradouro}, {order.numero}{order.complemento ? `, ${order.complemento}` : ""}</p><p>{order.bairro} · {order.cidade}/{order.uf}</p><p>CEP {order.cepDestino}</p></div>
          </section>
          <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-[var(--brand-color)]" /><h3 className="font-display text-sm font-bold text-white">Forma de envio</h3></div>
            <div className="mt-4 text-xs leading-6 text-white/50"><p className="font-semibold text-white/75">{order.shipment?.transportadora ?? "Transportadora selecionada no checkout"}</p><p>{order.shipment?.servico ?? "Aguardando preparação da etiqueta"}</p>{order.shipment?.codigoRastreio ? <p className="mt-2 font-mono text-[var(--brand-color)]">{order.shipment.codigoRastreio}</p> : null}</div>
          </section>
          {order.status === "aguardando_pagamento" ? <Link href={`/checkout/pagamento/${order.id}`} className="font-display flex min-h-11 items-center justify-center rounded-md bg-[var(--brand-color)] px-5 text-[10px] font-extrabold uppercase text-black">Continuar pagamento</Link> : null}
        </div>
      </div>
    </div>
  );
}
