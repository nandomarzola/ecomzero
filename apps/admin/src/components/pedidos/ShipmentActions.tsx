"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import {
  attachInvoiceAction,
  calculateOrderShippingAction,
  cancelShipmentAction,
  confirmFiscalDocumentAction,
  generateLabelAction,
  markExternalShipmentAction,
  prepareShipmentAction,
  purchaseShipmentAction,
  syncShipmentStatusAction,
} from "@/lib/actions/shipping";
import {
  labelStatusLabel,
  shippingModeLabel,
} from "@/lib/orders/status";

type ShippingOption = {
  id: string;
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
};

type ShippingQuote = {
  quoteId: string;
  expiresAt: string;
  options: ShippingOption[];
};

type Shipment = {
  melhorEnvioId: string | null;
  melhorEnvioProtocol: string | null;
  status: string;
  labelStatus: string;
  labelSource: string | null;
  serviceId: string | null;
  transportadora: string | null;
  servico: string | null;
  prazoDias: number | null;
  custoEstimado: number | null;
  custoEtiqueta: number | null;
  tipoDocumentoFiscal: "nota_fiscal" | "declaracao_conteudo" | null;
  tipoDocumentoFiscalConfirmadoEm: string | null;
  chaveNotaFiscal: string | null;
  codigoRastreio: string | null;
  urlRastreio: string | null;
  urlEtiqueta: string | null;
  ultimoErro: string | null;
  ultimoErroCodigo: string | null;
  tentativas: number;
  ultimaTentativaEm: string | null;
  geradoEm: string | null;
  impressoEm: string | null;
  events: Array<{
    id: string;
    type: string;
    status: string | null;
    message: string | null;
    createdAt: string;
  }>;
} | null;

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const freeShippingModes = new Set([
  "free_shipping_coupon",
  "free_shipping_threshold",
]);

export default function ShipmentActions({
  orderId,
  shippingMode,
  shippingAmountCharged,
  senderStateRegister,
  defaultFiscalDocumentType,
  autoPurchaseEnabled,
  balance,
  shipment,
}: {
  orderId: string;
  shippingMode: string;
  shippingAmountCharged: number;
  senderStateRegister: string | null;
  defaultFiscalDocumentType: "nota_fiscal" | "declaracao_conteudo";
  autoPurchaseEnabled: boolean;
  balance: {
    status: "live" | "stale" | "unavailable";
    value: number | null;
    checkedAt: string | null;
    error: string | null;
  };
  shipment: Shipment;
}) {
  const router = useRouter();
  const [invoiceKey, setInvoiceKey] = useState(shipment?.chaveNotaFiscal ?? "");
  const [selectedFiscalType, setSelectedFiscalType] = useState<
    "nota_fiscal" | "declaracao_conteudo"
  >(
    shipment?.tipoDocumentoFiscalConfirmadoEm && shipment.tipoDocumentoFiscal
      ? shipment.tipoDocumentoFiscal
      : defaultFiscalDocumentType,
  );
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [quotePending, startQuoteTransition] = useTransition();
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState(
    shipment?.serviceId ?? "",
  );

  const isFreeShipping = freeShippingModes.has(shippingMode);
  const fiscalDocumentConfirmed = Boolean(
    shipment?.tipoDocumentoFiscalConfirmadoEm &&
      shipment.tipoDocumentoFiscal === selectedFiscalType,
  );
  const fiscalDocumentLocked = Boolean(shipment?.melhorEnvioId);
  const invoiceSaved = Boolean(
    shipment?.chaveNotaFiscal && shipment.chaveNotaFiscal === invoiceKey,
  );
  const invoiceFormatValid = /^\d{44}$/.test(invoiceKey);
  const labelStatus = shipment?.labelStatus ?? "awaiting_shipping_data";

  function applyQuote(result: ShippingQuote) {
    setShippingQuote(result);
    setSelectedShippingOptionId(
      shipment?.serviceId && result.options.some((option) => option.id === shipment.serviceId)
        ? shipment.serviceId
        : result.options[0]?.id ?? "",
    );
  }

  function calculateShipping() {
    setError(null);
    startQuoteTransition(async () => {
      const result = await calculateOrderShippingAction(orderId);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível calcular o frete deste pedido.");
        return;
      }
      applyQuote(result.data);
    });
  }

  useEffect(() => {
    if (!isFreeShipping || shipment?.melhorEnvioId) return;
    const timer = window.setTimeout(() => {
      startQuoteTransition(async () => {
        const result = await calculateOrderShippingAction(orderId);
        if (!result.ok) {
          setError(result.error ?? "Não foi possível calcular o frete deste pedido.");
          return;
        }
        setShippingQuote(result.data);
        setSelectedShippingOptionId(
          shipment?.serviceId && result.data.options.some((option) => option.id === shipment.serviceId)
            ? shipment.serviceId
            : result.data.options[0]?.id ?? "",
        );
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isFreeShipping, orderId, shipment?.melhorEnvioId, shipment?.serviceId]);

  function run(
    name: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMessage: string,
  ) {
    setError(null);
    setSuccess(null);
    setOperation(name);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Não foi possível concluir a operação.");
      else {
        setSuccess(successMessage);
        router.refresh();
      }
      setOperation(null);
    });
  }

  function saveInvoice() {
    run(
      "invoice",
      () => attachInvoiceAction(orderId, { invoiceKey }),
      "Chave da NF-e validada e vinculada ao pedido.",
    );
  }

  function confirmFiscalDocument() {
    run(
      "fiscal-document",
      () =>
        confirmFiscalDocumentAction(
          orderId,
          selectedFiscalType === "nota_fiscal"
            ? { tipoDocumentoFiscal: "nota_fiscal" }
            : {
                tipoDocumentoFiscal: "declaracao_conteudo",
                declaracaoConfirmada: declarationConfirmed,
              },
        ),
      selectedFiscalType === "nota_fiscal"
        ? "NF-e confirmada como documento fiscal deste pedido."
        : "Declaração de conteúdo confirmada para este pedido.",
    );
  }

  function prepare(serviceId?: string) {
    run(
      "prepare",
      () => prepareShipmentAction(orderId, serviceId),
      "Cotação e dados logísticos atualizados.",
    );
  }

  function purchase() {
    if (!window.confirm("Comprar e gerar esta etiqueta no Melhor Envio? O custo será debitado da Melhor Carteira.")) return;
    run(
      "purchase",
      () => purchaseShipmentAction(orderId),
      "Etiqueta gerada com sucesso.",
    );
  }

  function markExternal() {
    if (!window.confirm("Marcar este pedido como envio externo? Ele deixará a fila do Melhor Envio.")) return;
    run(
      "external",
      () => markExternalShipmentAction(orderId),
      "Pedido marcado como envio externo.",
    );
  }

  function cancelLabel() {
    if (!window.confirm("Cancelar esta etiqueta no Melhor Envio? O cancelamento pode depender da aprovação da transportadora.")) return;
    run(
      "cancel",
      () => cancelShipmentAction(orderId),
      "Cancelamento solicitado ao Melhor Envio.",
    );
  }

  function generateLegacyLabel() {
    if (!window.confirm("Gerar o arquivo da etiqueta comprada?")) return;
    run(
      "generate",
      () => generateLabelAction(orderId),
      "Etiqueta gerada com sucesso.",
    );
  }

  return (
    <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A9EC17]">Expedição</p>
          <h2 className="font-display mt-1 text-lg font-bold">Fiscal e logística</h2>
          <p className="mt-1 text-xs text-white/40">
            {!fiscalDocumentConfirmed
              ? "Confirme o documento de cada pedido antes de gerar a etiqueta."
              : selectedFiscalType === "nota_fiscal"
                ? "Pedido confirmado para envio com NF-e."
                : "Pedido confirmado para envio com declaração de conteúdo."}
          </p>
        </div>
        <span className="rounded-full border border-[#A9EC17]/20 bg-[#A9EC17]/5 px-3 py-1 text-xs text-[#D9FF87]">
          {labelStatusLabel(labelStatus)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Tipo de frete" value={shippingModeLabel(shippingMode)} detail={isFreeShipping ? "Grátis para o cliente; custo da loja" : "Contratado pelo cliente"} />
        <InfoCard label="Serviço selecionado" value={shipment?.transportadora && shipment.servico ? `${shipment.transportadora} · ${shipment.servico}` : "Aguardando cotação"} detail={shipment?.prazoDias ? `Até ${shipment.prazoDias} dias úteis` : null} />
        <InfoCard label="Custo da etiqueta" value={shipment?.custoEtiqueta !== null && shipment?.custoEtiqueta !== undefined ? money(shipment.custoEtiqueta) : shipment?.custoEstimado !== null && shipment?.custoEstimado !== undefined ? `${money(shipment.custoEstimado)} estimado` : "—"} detail={`Cobrado do cliente: ${money(shippingAmountCharged)}`} />
        <InfoCard
          label="Melhor Carteira"
          value={balance.value !== null ? money(balance.value) : "Saldo indisponível"}
          detail={balance.status === "stale"
            ? `Última consulta conhecida (desatualizada)${balance.checkedAt ? `: ${new Date(balance.checkedAt).toLocaleString("pt-BR")}` : ""}${balance.error ? ` · Falha ao atualizar: ${balance.error}` : ""}`
            : balance.status === "live" && balance.checkedAt
              ? `Consulta: ${new Date(balance.checkedAt).toLocaleString("pt-BR")}`
              : balance.error ?? null}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#090909] p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#A9EC17]" />
              <h3 className="text-sm font-semibold">Documento do envio</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-white/40">
              A opção da loja é apenas uma pré-seleção. Este pedido só avança depois da confirmação abaixo.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${selectedFiscalType === "declaracao_conteudo" ? "border-[#A9EC17]/50 bg-[#A9EC17]/[0.06]" : "border-white/[0.08]"} ${fiscalDocumentLocked ? "cursor-not-allowed opacity-65" : ""}`}>
                <input
                  type="radio"
                  name="fiscal-document"
                  checked={selectedFiscalType === "declaracao_conteudo"}
                  disabled={fiscalDocumentLocked}
                  onChange={() => {
                    setSelectedFiscalType("declaracao_conteudo");
                    setDeclarationConfirmed(false);
                  }}
                  className="mt-1 accent-[#A9EC17]"
                />
                <span className="text-xs leading-5 text-white/55">
                  <strong className="block text-sm text-white/85">Declaração de conteúdo</strong>
                  Somente para envio não comercial permitido. Usa produtos, quantidades e valores do pedido.
                </span>
              </label>
              <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${selectedFiscalType === "nota_fiscal" ? "border-[#A9EC17]/50 bg-[#A9EC17]/[0.06]" : "border-white/[0.08]"} ${fiscalDocumentLocked ? "cursor-not-allowed opacity-65" : ""}`}>
                <input
                  type="radio"
                  name="fiscal-document"
                  checked={selectedFiscalType === "nota_fiscal"}
                  disabled={fiscalDocumentLocked}
                  onChange={() => setSelectedFiscalType("nota_fiscal")}
                  className="mt-1 accent-[#A9EC17]"
                />
                <span className="text-xs leading-5 text-white/55">
                  <strong className="block text-sm text-white/85">NF-e</strong>
                  Para venda comercial. Exige CNPJ, inscrição estadual e chave válida com 44 dígitos.
                </span>
              </label>
            </div>

            {!fiscalDocumentConfirmed && selectedFiscalType === "declaracao_conteudo" ? (
              <label className="mt-4 flex gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3 text-xs leading-5 text-amber-100/75">
                <input
                  type="checkbox"
                  checked={declarationConfirmed}
                  onChange={(event) => setDeclarationConfirmed(event.target.checked)}
                  className="mt-1 accent-[#A9EC17]"
                />
                Confirmo que este envio é não comercial e pode usar declaração de conteúdo conforme as regras aplicáveis.
              </label>
            ) : null}

            {!fiscalDocumentConfirmed ? (
              <button
                type="button"
                disabled={pending || fiscalDocumentLocked || (selectedFiscalType === "declaracao_conteudo" && !declarationConfirmed)}
                onClick={confirmFiscalDocument}
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#A9EC17] px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                {operation === "fiscal-document" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                Confirmar para este pedido
              </button>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-xs text-[#A9EC17]">
                <CheckCircle2 className="h-4 w-4" /> Escolha confirmada para este pedido.
              </p>
            )}

            {fiscalDocumentConfirmed && selectedFiscalType === "nota_fiscal" ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="flex flex-col gap-1.5 text-xs text-white/55">
                    Chave da NF-e
                    <input
                      value={invoiceKey}
                      onChange={(event) => setInvoiceKey(event.target.value.replace(/\D/g, "").slice(0, 44))}
                      inputMode="numeric"
                      maxLength={44}
                      placeholder="44 dígitos"
                      className="h-10 rounded-lg border border-white/10 bg-[#050505] px-3 font-mono text-sm text-white outline-none focus:border-[#A9EC17]/50"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending || !invoiceFormatValid}
                    onClick={saveInvoice}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#A9EC17] px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {operation === "invoice" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                    Validar e salvar NF-e
                  </button>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <p className={invoiceSaved ? "text-[#A9EC17]" : "text-amber-300"}>
                    {invoiceSaved ? "Chave validada no backend" : `${invoiceKey.length}/44 dígitos`}
                  </p>
                  <p className={senderStateRegister ? "text-white/55" : "text-red-300"}>
                    Inscrição estadual: {senderStateRegister ?? "não cadastrada"}
                  </p>
                </div>
              </>
            ) : null}

            {fiscalDocumentConfirmed && selectedFiscalType === "declaracao_conteudo" ? (
              <p className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs leading-5 text-white/50">
                Nenhuma chave de NF-e será enviada. O Melhor Envio receberá os itens, quantidades e valores deste pedido para a declaração.
              </p>
            ) : null}
          </div>

          {isFreeShipping && !shipment?.melhorEnvioId ? (
            <div className="rounded-xl border border-[#A9EC17]/20 bg-[#A9EC17]/[0.03] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Transportadora para o frete grátis</h3>
                  <p className="mt-1 text-xs text-white/40">A opção mais barata vem selecionada, mas você pode escolher outra antes da compra.</p>
                </div>
                <button type="button" disabled={quotePending} onClick={calculateShipping} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${quotePending ? "animate-spin" : ""}`} /> Recalcular
                </button>
              </div>
              {quotePending && !shippingQuote ? (
                <p className="mt-4 flex items-center gap-2 text-xs text-white/45"><Loader2 className="h-4 w-4 animate-spin text-[#A9EC17]" /> Consultando transportadoras...</p>
              ) : null}
              {shippingQuote ? (
                <div className="mt-4 grid gap-2 lg:grid-cols-2">
                  {shippingQuote.options.map((option, index) => (
                    <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${selectedShippingOptionId === option.id ? "border-[#A9EC17]/50 bg-[#A9EC17]/[0.06]" : "border-white/[0.08]"}`}>
                      <input type="radio" name="shipping-option" checked={selectedShippingOptionId === option.id} onChange={() => setSelectedShippingOptionId(option.id)} className="accent-[#A9EC17]" />
                      <span className="min-w-0 flex-1 text-sm">
                        <strong>{option.transportadora} · {option.servico}</strong>
                        <small className="mt-1 block text-white/40">Até {option.prazoDias} dias úteis {index === 0 ? "· mais barato" : ""}</small>
                      </span>
                      <strong className="text-[#A9EC17]">{money(option.preco)}</strong>
                    </label>
                  ))}
                  <button type="button" disabled={pending || !selectedShippingOptionId} onClick={() => prepare(selectedShippingOptionId)} className="rounded-lg border border-[#A9EC17]/30 px-4 py-2.5 text-sm font-semibold text-[#A9EC17] disabled:opacity-50 lg:col-span-2">
                    Confirmar serviço selecionado
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {!autoPurchaseEnabled ? (
            <div className="flex gap-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3 text-xs leading-5 text-amber-100/75">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              Compra real bloqueada por segurança. Para liberar, configure MELHOR_ENVIO_AUTO_PURCHASE_ENABLED=true no storefront e no admin.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {["awaiting_shipping_data", "awaiting_fiscal_document", "error", "insufficient_balance", "awaiting_invoice"].includes(labelStatus) ? (
              <button type="button" disabled={pending || quotePending} onClick={() => prepare()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/70 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${operation === "prepare" ? "animate-spin" : ""}`} /> Revalidar preparação
              </button>
            ) : null}
            {labelStatus === "ready_to_purchase" ? (
              <button type="button" disabled={pending || !autoPurchaseEnabled} onClick={purchase} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-45">
                {operation === "purchase" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} Comprar e gerar etiqueta
              </button>
            ) : null}
            {labelStatus === "purchased" ? (
              <button type="button" disabled={pending} onClick={generateLegacyLabel} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">
                <PackageCheck className="h-4 w-4" /> Gerar etiqueta comprada
              </button>
            ) : null}
            {["generated", "printed", "posted", "in_transit", "delivered"].includes(labelStatus) ? (
              <>
                <a href={`/pedidos/${orderId}/etiqueta?autoprint=1`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black"><Printer className="h-4 w-4" /> Imprimir etiqueta</a>
                <a href={`/api/orders/${orderId}/label/jpeg?download=1`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/70"><FileText className="h-4 w-4" /> Baixar etiqueta</a>
              </>
            ) : null}
            {shipment?.melhorEnvioId ? (
              <button type="button" disabled={pending} onClick={() => run("sync", () => syncShipmentStatusAction(orderId), "Status atualizado.")} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/70 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${operation === "sync" ? "animate-spin" : ""}`} /> Atualizar status</button>
            ) : null}
            {shipment?.melhorEnvioId && ["purchased", "generated", "printed"].includes(labelStatus) ? (
              <button type="button" disabled={pending} onClick={cancelLabel} className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-4 py-2.5 text-sm text-red-300 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Cancelar etiqueta</button>
            ) : null}
            {!shipment?.melhorEnvioId && labelStatus !== "external" ? (
              <button type="button" disabled={pending} onClick={markExternal} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 disabled:opacity-50"><Truck className="h-4 w-4" /> Marcar como envio externo</button>
            ) : null}
            {shipment?.urlRastreio ? (
              <a href={shipment.urlRastreio} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/70">Abrir rastreio <ExternalLink className="h-4 w-4" /></a>
            ) : null}
          </div>
        </div>

        <aside className="rounded-xl border border-white/[0.08] bg-[#090909] p-4">
          <h3 className="text-sm font-semibold">Histórico e diagnóstico</h3>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-white/35">Origem</dt><dd className="mt-1 text-white/70">{shipment?.labelSource === "automatic" ? "Automática" : shipment?.labelSource === "manual" ? "Manual" : shipment?.labelSource === "external" ? "Externa" : "Ainda não definida"}</dd></div>
            <div><dt className="text-white/35">Tentativas</dt><dd className="mt-1 text-white/70">{shipment?.tentativas ?? 0}</dd></div>
            <div className="col-span-2"><dt className="text-white/35">Última tentativa</dt><dd className="mt-1 text-white/70">{shipment?.ultimaTentativaEm ? new Date(shipment.ultimaTentativaEm).toLocaleString("pt-BR") : "—"}</dd></div>
            {shipment?.codigoRastreio ? <div className="col-span-2"><dt className="text-white/35">Rastreio</dt><dd className="mt-1 font-mono text-white/70">{shipment.codigoRastreio}</dd></div> : null}
          </dl>

          {shipment?.ultimoErro ? (
            <div className="mt-4 flex gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-xs leading-5 text-red-200/80">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span><strong className="block text-red-200">{shipment.ultimoErroCodigo === "INSUFFICIENT_BALANCE" ? "Saldo insuficiente" : "Última tentativa não concluída"}</strong>{shipment.ultimoErro}</span>
            </div>
          ) : null}

          <ol className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
            {shipment?.events.length ? shipment.events.map((event) => (
              <li key={event.id} className="flex gap-2 text-xs">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A9EC17]" />
                <div><p className="leading-5 text-white/60">{event.message ?? event.type}</p><time className="text-[10px] text-white/30">{new Date(event.createdAt).toLocaleString("pt-BR")}</time></div>
              </li>
            )) : <li className="text-xs text-white/35">Nenhum evento logístico registrado.</li>}
          </ol>
        </aside>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      {success ? <p role="status" className="mt-4 rounded-lg border border-[#A9EC17]/25 bg-[#A9EC17]/[0.06] px-3 py-2 text-sm text-[#D9FF87]">{success}</p> : null}
    </section>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string | null }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#090909] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-white/80">{value}</p>
      {detail ? <p className="mt-1 text-[11px] leading-4 text-white/35">{detail}</p> : null}
    </div>
  );
}
