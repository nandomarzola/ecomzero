import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, CreditCard, MapPin, Package } from "lucide-react";
import ShipmentActions from "@/components/pedidos/ShipmentActions";
import CancelOrderButton from "@/components/pedidos/CancelOrderButton";
import { config } from "@/lib/config";
import {
  getAdminOrderDetails,
  getShippingSettings,
} from "@/lib/services/shippingFulfillmentAdminService";
import { getMelhorEnvioBalance } from "@/lib/services/melhorEnvioAdminService";

export const dynamic = "force-dynamic";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const productImageUrl = (image: string) => {
  if (/^(?:https?:|data:|blob:)/i.test(image)) return image;
  const storefrontUrl = config.storefrontUrl ?? "https://www.ecomzero.com.br";
  return new URL(image.startsWith("/") ? image : `/${image}`, storefrontUrl).toString();
};

const orderStatusLabel = {
  draft: "Carrinho",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pagamento confirmado",
  cancelado: "Cancelado",
};

const cancellationReasonLabel = {
  customer_request: "Cliente desistiu",
  out_of_stock: "Fora de estoque",
  suspected_fraud: "Fraude suspeita",
  other: "Outro",
};

export default async function AdminOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, shippingSettings, balance] = await Promise.all([
    getAdminOrderDetails(id),
    getShippingSettings(),
    getMelhorEnvioBalance(),
  ]);
  if (!order || order.status === "draft") notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/pedidos" className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Voltar aos pedidos</Link>
          <h2 className="font-display mt-2 text-2xl font-bold">Pedido #{order.id.slice(0, 8)}</h2>
          <p className="mt-1 text-xs text-white/35">Criado em {order.createdAt.toLocaleString("pt-BR")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={order.status === "cancelado"
            ? "rounded-full border border-red-400/20 bg-red-400/[0.06] px-3 py-1 text-xs text-red-200"
            : "rounded-full border border-[#A9EC17]/20 bg-[#A9EC17]/5 px-3 py-1 text-xs text-[#D9FF87]"}
          >
            {orderStatusLabel[order.status]}
          </span>
          <CancelOrderButton
            orderId={order.id}
            orderStatus={order.status}
            total={Number(order.total)}
            hasMelhorEnvioLabel={Boolean(order.shipment?.melhorEnvioId)}
          />
        </div>
      </div>

      {order.cancellation ? (
        <section className="rounded-xl border border-red-400/15 bg-red-400/[0.035] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-300/80">Cancelamento</p>
              <h3 className="font-display mt-1 font-bold text-white">
                {cancellationReasonLabel[order.cancellation.reason]}
              </h3>
              {order.cancellation.note ? (
                <p className="mt-2 text-sm text-white/55">{order.cancellation.note}</p>
              ) : null}
            </div>
            <span className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1 text-xs text-white/60">
              {order.cancellation.status === "completed"
                ? "Concluído"
                : order.cancellation.status === "processing"
                  ? "Processando"
                  : "Falhou"}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 border-t border-white/[0.07] pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-white/35">Solicitado por</dt><dd className="mt-1 text-white/70">{order.cancellation.requestedBy}</dd></div>
            <div><dt className="text-white/35">Data</dt><dd className="mt-1 text-white/70">{(order.cancellation.completedAt ?? order.cancellation.createdAt).toLocaleString("pt-BR")}</dd></div>
            <div><dt className="text-white/35">Etiqueta</dt><dd className="mt-1 text-white/70">{order.cancellation.shipmentCanceled ? "Cancelada no Melhor Envio" : "Sem cancelamento necessário"}</dd></div>
            <div><dt className="text-white/35">Estorno</dt><dd className="mt-1 text-white/70">{order.cancellation.mercadoPagoRefundStatus ?? "Não aplicável"}</dd></div>
          </dl>
          {order.cancellation.lastError ? (
            <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-200">{order.cancellation.lastError}</p>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-center gap-2"><Package className="h-4 w-4 text-[#A9EC17]" /><h3 className="font-display font-bold">Itens do pedido</h3></div>
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white">
                  <Image
                    src={productImageUrl(item.variant.product.imagem)}
                    alt={item.variant.product.nome}
                    fill
                    sizes="64px"
                    className="object-contain"
                  />
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
            {Number(order.descontoCupom) > 0 ? <div className="flex justify-between text-[#A9EC17]"><dt>Desconto (cupom)</dt><dd>- {money(Number(order.descontoCupom))}</dd></div> : null}
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

      {order.status === "pago" ? (
        <ShipmentActions
          orderId={order.id}
          shippingMode={order.shippingMode}
          shippingAmountCharged={Number(order.shippingAmountCharged)}
          senderStateRegister={shippingSettings?.inscricaoEstadual ?? null}
          defaultFiscalDocumentType={shippingSettings?.documentoFiscalPadrao ?? "declaracao_conteudo"}
          balance={balance}
          shipment={order.shipment
            ? {
                melhorEnvioId: order.shipment.melhorEnvioId,
                melhorEnvioProtocol: order.shipment.melhorEnvioProtocol,
                status: order.shipment.status,
                labelStatus: order.shipment.labelStatus,
                labelSource: order.shipment.labelSource,
                serviceId: order.shipment.serviceId,
                transportadora: order.shipment.transportadora,
                servico: order.shipment.servico,
                prazoDias: order.shipment.prazoDias,
                custoEstimado: order.shipment.custoEstimado === null
                  ? null
                  : Number(order.shipment.custoEstimado),
                custoEtiqueta: order.shipment.custoEtiqueta === null
                  ? null
                  : Number(order.shipment.custoEtiqueta),
                tipoDocumentoFiscal: order.shipment.tipoDocumentoFiscal,
                tipoDocumentoFiscalConfirmadoEm:
                  order.shipment.tipoDocumentoFiscalConfirmadoEm?.toISOString() ?? null,
                chaveNotaFiscal: order.shipment.chaveNotaFiscal,
                codigoRastreio: order.shipment.codigoRastreio,
                urlRastreio: order.shipment.urlRastreio,
                urlEtiqueta: order.shipment.urlEtiqueta,
                ultimoErro: order.shipment.ultimoErro,
                ultimoErroCodigo: order.shipment.ultimoErroCodigo,
                tentativas: order.shipment.tentativas,
                ultimaTentativaEm: order.shipment.ultimaTentativaEm?.toISOString() ?? null,
                geradoEm: order.shipment.geradoEm?.toISOString() ?? null,
                impressoEm: order.shipment.impressoEm?.toISOString() ?? null,
                events: order.shipment.events.map((event) => ({
                  id: event.id,
                  type: event.type,
                  status: event.status,
                  message: event.message,
                  createdAt: event.createdAt.toISOString(),
                })),
              }
            : null}
        />
      ) : order.status === "cancelado" ? (
        <p className="rounded-xl border border-red-400/20 bg-red-400/[0.05] p-4 text-sm text-red-200">Este pedido foi cancelado e não pode seguir para expedição.</p>
      ) : (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4 text-sm text-amber-200">A expedição será liberada quando o pagamento for confirmado.</p>
      )}

      {order.events.length > 0 ? (
        <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#A9EC17]" />
            <h3 className="font-display font-bold">Histórico do pedido</h3>
          </div>
          <ol className="mt-4 divide-y divide-white/[0.06]">
            {order.events.map((event) => (
              <li key={event.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-white/75">{event.message ?? event.type}</p>
                  {event.actorEmail ? <p className="mt-1 text-xs text-white/35">{event.actorEmail}</p> : null}
                </div>
                <time className="shrink-0 text-xs text-white/35">{event.createdAt.toLocaleString("pt-BR")}</time>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
