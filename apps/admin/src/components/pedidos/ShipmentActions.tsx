"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, PackageCheck, Printer, RefreshCw, ShoppingCart, WandSparkles, X } from "lucide-react";
import {
  createShipmentAction,
  dismissShipmentErrorAction,
  generateLabelAction,
  purchaseShipmentAction,
  syncTrackingAction,
} from "@/lib/actions/shipping";

type Shipment = {
  melhorEnvioId: string | null;
  melhorEnvioProtocol: string | null;
  status: string;
  transportadora: string | null;
  servico: string | null;
  codigoRastreio: string | null;
  urlRastreio: string | null;
  ultimoErro: string | null;
} | null;

const statusLabel: Record<string, string> = {
  creating: "Preparando integração",
  pending: "No carrinho do Melhor Envio",
  released: "Etiqueta comprada",
  generated: "Etiqueta gerada",
  received: "Recebido no ponto de postagem",
  posted: "Postado / em trânsito",
  delivered: "Entregue",
  undelivered: "Não entregue",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  paused: "Pausado",
  suspended: "Suspenso",
};

export default function ShipmentActions({
  orderId,
  shipment,
}: {
  orderId: string;
  shipment: Shipment;
}) {
  const router = useRouter();
  const [fiscalType, setFiscalType] = useState<"nota_fiscal" | "declaracao_conteudo">("nota_fiscal");
  const [invoiceKey, setInvoiceKey] = useState("");
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(name: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setOperation(name);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Não foi possível concluir a operação.");
      else router.refresh();
      setOperation(null);
    });
  }

  function createShipment() {
    run("create", () =>
      createShipmentAction(
        orderId,
        fiscalType === "nota_fiscal"
          ? { tipoDocumentoFiscal: fiscalType, chaveNotaFiscal: invoiceKey }
          : {
              tipoDocumentoFiscal: fiscalType,
              declaracaoConfirmada: declarationConfirmed,
            },
      ),
    );
  }

  function purchase() {
    if (!window.confirm("Comprar esta etiqueta? O valor será descontado do saldo da Melhor Carteira.")) return;
    run("purchase", () => purchaseShipmentAction(orderId));
  }

  function generate() {
    if (!window.confirm("Gerar a etiqueta térmica 10×15 agora? Nesta etapa a transportadora pode ser comunicada do envio.")) return;
    const tab = window.open("about:blank", "_blank");
    setError(null);
    setOperation("generate");
    startTransition(async () => {
      const result = await generateLabelAction(orderId);
      if (!result.ok) {
        tab?.close();
        setError(result.error);
      } else {
        const printUrl = new URL(`/pedidos/${orderId}/etiqueta?autoprint=1`, window.location.origin).toString();
        if (tab) {
          tab.opener = null;
          tab.location.href = printUrl;
        } else {
          window.location.href = printUrl;
        }
        router.refresh();
      }
      setOperation(null);
    });
  }

  const noRemoteShipment = !shipment?.melhorEnvioId;
  const canPrintThermal = Boolean(
    shipment &&
      [
        "generated",
        "received",
        "posted",
        "delivered",
        "undelivered",
        "paused",
        "suspended",
      ].includes(shipment.status),
  );

  // Legenda do estágio atual — deixa explícito qual é a próxima ação, evitando
  // a ambiguidade de "Comprar etiqueta" enquanto o pedido já está no carrinho.
  const stageHint = shipment
    ? shipment.status === "pending"
      ? "O pedido já está no carrinho do Melhor Envio. Finalize a compra para debitar o frete e liberar a etiqueta."
      : shipment.status === "released"
        ? "Etiqueta comprada. Gere o arquivo da etiqueta para imprimir."
        : canPrintThermal
          ? "Etiqueta pronta. Imprima e cole no pacote; use Atualizar status para acompanhar o rastreio."
          : "Acompanhe o andamento do envio pelo Melhor Envio."
    : null;

  return (
    <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A9EC17]">Expedição</p>
          <h2 className="font-display mt-1 text-lg font-bold">Etiqueta Melhor Envio</h2>
        </div>
        {shipment ? (
          <span className="rounded-full border border-[#A9EC17]/20 bg-[#A9EC17]/5 px-3 py-1 text-xs text-[#D9FF87]">
            {statusLabel[shipment.status] ?? shipment.status}
          </span>
        ) : null}
      </div>

      {noRemoteShipment ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`cursor-pointer rounded-lg border p-4 ${fiscalType === "nota_fiscal" ? "border-[#A9EC17]/40 bg-[#A9EC17]/5" : "border-white/10"}`}>
              <input type="radio" name="fiscal" value="nota_fiscal" checked={fiscalType === "nota_fiscal"} onChange={() => setFiscalType("nota_fiscal")} className="mr-2 accent-[#A9EC17]" />
              <span className="text-sm font-semibold">NF-e</span>
              <p className="mt-1 text-xs leading-5 text-white/40">Obrigatória para venda comercial.</p>
            </label>
            <label className={`cursor-pointer rounded-lg border p-4 ${fiscalType === "declaracao_conteudo" ? "border-amber-300/40 bg-amber-300/5" : "border-white/10"}`}>
              <input type="radio" name="fiscal" value="declaracao_conteudo" checked={fiscalType === "declaracao_conteudo"} onChange={() => setFiscalType("declaracao_conteudo")} className="mr-2 accent-[#A9EC17]" />
              <span className="text-sm font-semibold">Declaração de conteúdo</span>
              <p className="mt-1 text-xs leading-5 text-white/40">Somente para envio não comercial permitido.</p>
            </label>
          </div>

          {fiscalType === "nota_fiscal" ? (
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Chave da NF-e
              <input value={invoiceKey} onChange={(event) => setInvoiceKey(event.target.value)} maxLength={54} placeholder="44 dígitos" className="rounded-lg border border-white/10 bg-[#090909] px-3 py-2.5 text-sm text-white outline-none focus:border-[#A9EC17]/50" />
            </label>
          ) : (
            <label className="flex items-start gap-2 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs leading-5 text-amber-100/75">
              <input type="checkbox" checked={declarationConfirmed} onChange={(event) => setDeclarationConfirmed(event.target.checked)} className="mt-1 accent-[#A9EC17]" />
              Confirmo que este envio é não comercial e pode utilizar declaração de conteúdo conforme as regras aplicáveis.
            </label>
          )}

          <button type="button" disabled={pending} onClick={createShipment} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60">
            {operation === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Enviar ao carrinho do Melhor Envio
          </button>
        </div>
      ) : (
        <div className="mt-5">
          <dl className="grid gap-3 rounded-lg border border-white/[0.07] bg-[#090909] p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-white/35">Transportadora e serviço</dt><dd className="mt-1 text-white/75">{shipment.transportadora ?? "—"} · {shipment.servico ?? "—"}</dd></div>
            <div><dt className="text-xs text-white/35">ID no Melhor Envio</dt><dd className="mt-1 font-mono text-xs text-white/60">{shipment.melhorEnvioId}</dd></div>
            {shipment.melhorEnvioProtocol ? <div><dt className="text-xs text-white/35">Protocolo</dt><dd className="mt-1 text-white/75">{shipment.melhorEnvioProtocol}</dd></div> : null}
            {shipment.codigoRastreio ? <div><dt className="text-xs text-white/35">Código de rastreio</dt><dd className="mt-1 font-mono text-white/75">{shipment.codigoRastreio}</dd></div> : null}
          </dl>

          {stageHint ? <p className="mt-3 text-xs leading-5 text-white/40">{stageHint}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {shipment.status === "pending" ? (
              <button type="button" disabled={pending} onClick={purchase} title="O pedido já está no carrinho do Melhor Envio. Clique para pagar e finalizar a compra da etiqueta." className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60">
                {operation === "purchase" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} Finalizar compra da etiqueta
              </button>
            ) : null}
            {shipment.status === "released" ? (
              <button type="button" disabled={pending} onClick={generate} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60">
                {operation === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />} Gerar etiqueta
              </button>
            ) : null}
            {canPrintThermal ? (
              <a href={`/pedidos/${orderId}/etiqueta?autoprint=1`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black">
                <Printer className="h-4 w-4" /> Imprimir etiqueta
              </a>
            ) : null}
            <button type="button" disabled={pending} onClick={() => run("sync", () => syncTrackingAction(orderId))} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${operation === "sync" ? "animate-spin" : ""}`} /> Atualizar status
            </button>
            {shipment.urlRastreio ? <a href={shipment.urlRastreio} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60">Abrir rastreio <ExternalLink className="h-4 w-4" /></a> : null}
          </div>
        </div>
      )}

      {/* Erro contextual: só aparece DEPOIS de uma ação do usuário nesta sessão. */}
      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : shipment?.ultimoErro ? (
        // Falha de uma tentativa anterior, persistida no banco (Shipment.ultimoErro).
        // Não é um erro atual — mostramos de forma discreta e acionável, nunca como
        // alarme vermelho fixo. Some ao concluir uma ação com sucesso (Atualizar status)
        // ou ao clicar em "Descartar aviso" (limpa a nota sem consultar a API).
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-white/45">
            <span className="text-white/60">A última tentativa não foi concluída no Melhor Envio.</span>{" "}
            Clique em <span className="text-white/70">Atualizar status</span> para sincronizar. Detalhe: {shipment.ultimoErro}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("dismiss", () => dismissShipmentErrorAction(orderId))}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-white/55 transition hover:text-white disabled:opacity-60 sm:self-auto"
          >
            {operation === "dismiss" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Descartar aviso
          </button>
        </div>
      ) : null}
    </section>
  );
}
