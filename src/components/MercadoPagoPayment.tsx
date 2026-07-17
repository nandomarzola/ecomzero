"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Payment,
  StatusScreen,
  initMercadoPago,
} from "@mercadopago/sdk-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock3,
  Globe2,
  Handshake,
  Info,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useCart } from "@/components/CartProvider";
import type { OrderPaymentPageData } from "@/lib/services/orderPaymentService";
import { clearCheckoutShippingSelection } from "@/lib/client/checkoutShippingStorage";

type PaymentDetails = {
  id: string;
  status: string;
  statusDetail: string | null;
  paymentMethodId: string | null;
  paymentTypeId: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
  threeDsExternalResourceUrl: string | null;
  threeDsCreq: string | null;
};

type PaymentApiResponse = {
  orderId: string;
  orderStatus: "aguardando_pagamento" | "pago" | "cancelado";
  payment: PaymentDetails | null;
  error?: string;
};

type MercadoPagoPaymentProps = {
  order: OrderPaymentPageData;
  publicKey: string;
};

const formatPrice = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pendingStatuses = new Set(["authorized", "in_process", "pending"]);

function MercadoPagoBrand({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Mercado Pago">
      <span className="flex h-10 w-14 items-center justify-center rounded-[50%] bg-gradient-to-br from-[#168EDA] via-[#3168D8] to-[#142F89] text-white shadow-inner shadow-white/20">
        <Handshake className="h-7 w-7" strokeWidth={1.8} />
      </span>
      <span className="font-display text-left text-[19px] font-extrabold leading-[0.8] tracking-[-0.04em] text-white">
        mercado
        <span className="block">pago</span>
      </span>
    </span>
  );
}

const getPaymentError = (statusDetail: string | null) => {
  const knownMessages: Record<string, string> = {
    cc_rejected_bad_filled_card_number: "Confira o número do cartão.",
    cc_rejected_bad_filled_date: "Confira a validade do cartão.",
    cc_rejected_bad_filled_security_code: "Confira o código de segurança.",
    cc_rejected_insufficient_amount: "O cartão não possui saldo suficiente.",
    cc_rejected_high_risk:
      "O pagamento não foi autorizado. Tente outra forma de pagamento.",
  };

  return statusDetail && knownMessages[statusDetail]
    ? knownMessages[statusDetail]
    : "O pagamento não foi aprovado. Confira os dados ou escolha outra forma.";
};

export default function MercadoPagoPayment({
  order,
  publicKey,
}: MercadoPagoPaymentProps) {
  const router = useRouter();
  const { clearCart } = useCart();
  const attemptIdRef = useRef<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePayment, setActivePayment] = useState<PaymentDetails | null>(
    null,
  );
  const activePaymentId = activePayment?.id;
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const finishApprovedPayment = useCallback(() => {
    clearCheckoutShippingSelection();
    clearCart();
    router.replace(`/pedido/${order.orderId}/sucesso`);
  }, [clearCart, order.orderId, router]);

  const nameParts = useMemo(() => order.customer.name.trim().split(/\s+/), [
    order.customer.name,
  ]);
  const initialization = useMemo<
    ComponentProps<typeof Payment>["initialization"]
  >(
    () => ({
      amount: order.total,
      payer: {
        email: order.customer.email,
        firstName: nameParts[0] ?? order.customer.name,
        lastName: nameParts.slice(1).join(" ") || nameParts[0],
        identification: {
          type:
            order.customer.document.replace(/\D/g, "").length === 14
              ? "CNPJ"
              : "CPF",
          number: order.customer.document.replace(/\D/g, ""),
        },
      },
    }),
    [nameParts, order.customer, order.total],
  );
  const customization = useMemo<
    ComponentProps<typeof Payment>["customization"]
  >(
    () => ({
      paymentMethods: {
        bankTransfer: ["pix"],
        creditCard: "all",
        debitCard: "all",
        maxInstallments: 12,
      },
      visual: {
        hideRedirectionPanel: true,
        defaultPaymentOption: { bankTransferForm: true },
        style: {
          theme: "dark",
          customVariables: {
            baseColor: "var(--brand-color)",
            baseColorFirstVariant: "#B8FF28",
            baseColorSecondVariant: "#86BE0F",
            buttonTextColor: "#050505",
            formBackgroundColor: "#0D0D0D",
            inputBackgroundColor: "#080808",
            textPrimaryColor: "#FFFFFF",
            textSecondaryColor: "#9A9A9A",
            outlinePrimaryColor: "#333333",
            outlineSecondaryColor: "var(--brand-color)",
            borderRadiusMedium: "8px",
            borderRadiusLarge: "12px",
          },
        },
      },
    }),
    [],
  );

  useEffect(() => {
    clearCheckoutShippingSelection();
  }, []);

  useEffect(() => {
    initMercadoPago(publicKey, { locale: "pt-BR" });
  }, [publicKey]);

  useEffect(() => {
    const controller = new AbortController();

    const loadExistingPayment = async () => {
      try {
        const response = await fetch(`/api/orders/${order.orderId}/payment`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | PaymentApiResponse
          | null;

        if (!response.ok || !data) {
          throw new Error(
            data?.error ?? "Não foi possível consultar o pagamento.",
          );
        }
        if (data.orderStatus === "pago") {
          finishApprovedPayment();
          return;
        }
        if (data.orderStatus === "cancelado") {
          router.replace(`/pedido/${order.orderId}/falha`);
          return;
        }
        if (data.payment && pendingStatuses.has(data.payment.status)) {
          setActivePayment(data.payment);
        } else if (data.payment) {
          setErrorMessage(getPaymentError(data.payment.statusDetail));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível consultar o pagamento.",
        );
      } finally {
        if (!controller.signal.aborted) setIsCheckingPayment(false);
      }
    };

    void loadExistingPayment();
    return () => controller.abort();
  }, [finishApprovedPayment, order.orderId, router]);

  useEffect(() => {
    if (!activePaymentId) return;

    const controller = new AbortController();
    const refreshStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${order.orderId}/payment`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as PaymentApiResponse;
        if (
          data.orderStatus === "pago" ||
          data.payment?.status === "approved"
        ) {
          finishApprovedPayment();
          return;
        }
        if (data.orderStatus === "cancelado") {
          router.replace(`/pedido/${order.orderId}/falha`);
          return;
        }
        if (data.payment && pendingStatuses.has(data.payment.status)) {
          setActivePayment(data.payment);
          return;
        }
        if (data.payment) {
          attemptIdRef.current = null;
          setActivePayment(null);
          setErrorMessage(getPaymentError(data.payment.statusDetail));
        }
      } catch {
        return;
      }
    };

    void refreshStatus();
    const interval = window.setInterval(refreshStatus, 2_500);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [activePaymentId, finishApprovedPayment, order.orderId, router]);

  const handleSubmit = useCallback<
    NonNullable<ComponentProps<typeof Payment>["onSubmit"]>
  >(
    async (brickData) => {
      setErrorMessage("");
      setIsSubmitting(true);
      const attemptId =
        attemptIdRef.current ?? window.crypto.randomUUID();
      attemptIdRef.current = attemptId;

      try {
        const response = await fetch(`/api/orders/${order.orderId}/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formData: brickData.formData,
            attemptId,
          }),
        });
        const data = (await response.json().catch(() => null)) as
          | PaymentApiResponse
          | null;

        if (!response.ok || !data) {
          throw new Error(
            data?.error ?? "Não foi possível processar o pagamento.",
          );
        }
        if (
          data.orderStatus === "pago" ||
          data.payment?.status === "approved"
        ) {
          finishApprovedPayment();
          return data;
        }
        if (data.payment && pendingStatuses.has(data.payment.status)) {
          setActivePayment(data.payment);
          return data;
        }

        attemptIdRef.current = null;
        setErrorMessage(getPaymentError(data.payment?.statusDetail ?? null));
        return data;
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível processar o pagamento.",
        );
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [finishApprovedPayment, order.orderId],
  );

  const copyPixCode = async () => {
    if (!activePayment?.qrCode) return;
    try {
      await navigator.clipboard.writeText(activePayment.qrCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setErrorMessage("Não foi possível copiar. Selecione o código manualmente.");
    }
  };

  const qrImage = activePayment?.qrCodeBase64
    ? activePayment.qrCodeBase64.startsWith("data:")
      ? activePayment.qrCodeBase64
      : `data:image/png;base64,${activePayment.qrCodeBase64}`
    : null;
  const isPix = activePayment?.paymentMethodId === "pix";
  const requiresThreeDs = Boolean(
    activePayment?.statusDetail === "pending_challenge" &&
      activePayment.threeDsExternalResourceUrl &&
      activePayment.threeDsCreq,
  );

  return (
    <div className="payment-checkout-page min-h-screen bg-[radial-gradient(circle_at_50%_38%,rgba(30,30,30,0.18),transparent_43%)] text-white">
      <nav aria-label="Etapas da compra" className="border-b border-white/[0.1] bg-[#050505]">
        <ol className="mx-auto flex h-10 max-w-[1332px] items-center gap-3 overflow-x-auto px-4 text-[11px] text-white/55 sm:px-6 lg:px-0 max-md:h-12 max-md:text-[13px]">
          <li><Link href="/carrinho" className="whitespace-nowrap transition hover:text-white">Carrinho</Link></li>
          <li aria-hidden="true"><ChevronRight className="h-4 w-4 text-white/35" /></li>
          <li><Link href="/checkout" className="whitespace-nowrap transition hover:text-white">Identificação</Link></li>
          <li aria-hidden="true" className="flex -space-x-2 text-[var(--brand-color)]"><ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4" /></li>
          <li aria-current="step" className="whitespace-nowrap font-semibold text-[var(--brand-color)]">Pagamento</li>
          <li aria-hidden="true"><ChevronRight className="h-4 w-4 text-white/35" /></li>
          <li className="whitespace-nowrap">Revisão</li>
        </ol>
      </nav>

      <div className="mx-auto max-w-[1332px] px-4 pb-5 pt-6 sm:px-6 lg:px-0 lg:pt-7">
        <header>
          <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">
            Escolha como pagar
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-white/65">
            Finalize sem sair da EcomZero.
            <span className="block">Seus dados financeiros são protegidos e processados pelo Mercado Pago.</span>
          </p>
        </header>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-9">
          <div className="min-w-0 space-y-4">
            <section
              aria-label="Pagamento processado pelo Mercado Pago"
              className="flex min-h-[102px] items-center justify-between gap-5 rounded-[10px] border border-[#009EE3]/35 bg-[linear-gradient(100deg,rgba(0,158,227,0.15),rgba(0,91,128,0.08))] px-5 py-4 sm:px-8"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#169EE7] to-[#075DBB] text-white shadow-[0_0_24px_rgba(0,158,227,0.25)]">
                  <ShieldCheck className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#75D7FF]">
                    Ambiente de pagamento seguro
                  </p>
                  <p className="font-display mt-1 text-[15px] font-bold text-white sm:text-[16px]">
                    Pagamento processado pelo Mercado Pago
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-white/50 sm:text-[11px]">
                    Seus dados são protegidos com criptografia de ponta a ponta e nunca são armazenados pela EcomZero.
                  </p>
                </div>
              </div>
              <MercadoPagoBrand className="hidden shrink-0 sm:inline-flex" />
            </section>

            <main className="min-w-0 rounded-[10px] border border-white/[0.13] bg-[linear-gradient(145deg,#111111,#0B0B0B)] p-3 shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:p-4">
              {isCheckingPayment ? (
                <div className="flex min-h-[420px] items-center justify-center gap-3 text-sm text-white/50">
                  <LoaderCircle className="h-5 w-5 animate-spin text-[var(--brand-color)]" />
                  Consultando pagamento...
                </div>
              ) : activePayment ? (
                <section className="mx-auto max-w-[600px] px-3 py-8 text-center">
              {requiresThreeDs ? (
                <StatusScreen
                  initialization={{
                    paymentId: activePayment.id,
                    additionalInfo: {
                      externalResourceURL:
                        activePayment.threeDsExternalResourceUrl!,
                      creq: activePayment.threeDsCreq!,
                    },
                  }}
                  customization={{
                    visual: {
                      hideTransactionDate: true,
                      showExternalReference: false,
                      style: {
                        theme: "dark",
                        customVariables: {
                          baseColor: "var(--brand-color)",
                          buttonTextColor: "#050505",
                          formBackgroundColor: "#0D0D0D",
                          inputBackgroundColor: "#080808",
                          textPrimaryColor: "#FFFFFF",
                          textSecondaryColor: "#9A9A9A",
                        },
                      },
                    },
                  }}
                  locale="pt-BR"
                  onError={() =>
                    setErrorMessage(
                      "Não foi possível abrir a validação do cartão. Atualize a página e tente novamente.",
                    )
                  }
                />
              ) : (
                <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--brand-color)]/20 bg-[var(--brand-color)]/10 text-[var(--brand-color)]">
                {isPix ? (
                  <Clock3 className="h-6 w-6" />
                ) : (
                  <ShieldCheck className="h-6 w-6" />
                )}
              </span>
              <h2 className="font-display mt-5 text-2xl font-extrabold text-white">
                {isPix ? "Pix gerado" : "Pagamento em processamento"}
              </h2>
              <p className="mx-auto mt-2 max-w-[480px] text-sm leading-6 text-white/50">
                {isPix
                  ? "Pague pelo aplicativo do seu banco. Esta página confirmará automaticamente quando o Pix for aprovado."
                  : "Aguarde a confirmação do Mercado Pago. Não é necessário atualizar a página."}
              </p>

              {isPix && qrImage && (
                <div className="mx-auto mt-6 w-fit rounded-xl bg-white p-4">
                  <Image
                    src={qrImage}
                    alt="QR Code Pix do pedido"
                    width={240}
                    height={240}
                    unoptimized
                  />
                </div>
              )}

              {isPix && activePayment.qrCode && (
                <div className="mt-6 text-left">
                  <label
                    htmlFor="pix-code"
                    className="text-[11px] font-semibold text-white/70"
                  >
                    Pix copia e cola
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="pix-code"
                      value={activePayment.qrCode}
                      readOnly
                      onFocus={(event) => event.currentTarget.select()}
                      className="h-12 min-w-0 flex-1 rounded-md border border-white/[0.14] bg-[#080808] px-3 text-xs text-white/65 outline-none focus:border-[var(--brand-color)] max-md:h-[52px] max-md:text-base"
                    />
                    <button
                      type="button"
                      onClick={copyPixCode}
                      className="store-primary-action font-display inline-flex h-12 shrink-0 items-center justify-center gap-2 px-4 text-[11px] font-extrabold uppercase transition max-md:h-[52px] max-md:text-sm"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Clipboard className="h-4 w-4" />
                      )}
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-[var(--brand-color)]/15 bg-[var(--brand-color)]/[0.05] px-4 py-3 text-[11px] text-white/55">
                <LoaderCircle className="h-4 w-4 animate-spin text-[var(--brand-color)]" />
                Aguardando confirmação automática do pagamento
              </div>
                </>
              )}
                </section>
              ) : (
                <>
                  {errorMessage && (
                    <p
                      role="alert"
                      className="mb-4 flex gap-2 rounded-md border border-red-400/20 bg-red-400/[0.06] p-3 text-[11px] leading-5 text-red-200"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {errorMessage}
                    </p>
                  )}
                  <div className={isSubmitting ? "pointer-events-none opacity-70" : ""}>
                    <Payment
                      initialization={initialization}
                      customization={customization}
                      locale="pt"
                      onSubmit={handleSubmit}
                      onError={() =>
                        setErrorMessage(
                          "Não foi possível carregar uma parte do pagamento. Atualize a página e tente novamente.",
                        )
                      }
                    />
                  </div>
                </>
              )}
            </main>
          </div>

          <aside className="lg:sticky lg:top-[92px] lg:self-start">
            <section className="rounded-[10px] border border-white/[0.13] bg-[linear-gradient(145deg,#111111,#0B0B0B)] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:p-6">
              <h2 className="font-display text-[18px] font-bold text-white">
                Resumo do pedido
              </h2>
              <div className="mt-5 space-y-4 border-b border-white/[0.09] pb-5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[7px] border border-white/[0.1] bg-white">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-3 text-[11px] font-medium leading-[16px] text-white/85">
                        {item.name}
                      </p>
                      <p className="mt-1 text-[10px] text-white/40">
                        {item.quantity} un. · {item.variant}
                      </p>
                    </div>
                    <strong className="shrink-0 text-[11px] font-semibold text-white">
                      {formatPrice(item.lineTotal)}
                    </strong>
                  </div>
                ))}
              </div>
              <dl className="space-y-3 border-b border-white/[0.09] py-5 text-[12px]">
                <div className="flex justify-between gap-4 text-white/55">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-white">{formatPrice(order.subtotal)}</dd>
                </div>
                {order.discount > 0 ? (
                  <div className="flex justify-between gap-4 text-white/55">
                    <dt>Desconto nos produtos</dt>
                    <dd className="font-semibold text-[var(--brand-color)]">-{formatPrice(order.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 text-white/55">
                  <dt>Frete</dt>
                  <dd className="font-medium text-white">{formatPrice(order.shipping)}</dd>
                </div>
              </dl>
              <div className="flex items-end justify-between py-5">
                <span className="font-display text-[13px] font-bold text-white">Total</span>
                <strong className="font-display text-[28px] font-extrabold leading-none text-[var(--brand-color)]">
                  {formatPrice(order.total)}
                </strong>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/[0.16] bg-black/10 p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)]">
                  <LockKeyhole className="h-6 w-6" strokeWidth={1.6} />
                </span>
                <div>
                  <strong className="block text-[11px] font-semibold text-white">Compra 100% segura</strong>
                  <p className="mt-1 text-[10px] leading-4 text-white/55">
                    Seus pagamentos são processados pelo Mercado Pago. Seus dados estão protegidos.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 divide-x divide-white/[0.07] text-center text-[9px] leading-4 text-white/50">
                <span className="flex flex-col items-center gap-2 px-1">
                  <ShieldCheck className="h-5 w-5 text-[var(--brand-color)]" strokeWidth={1.7} />
                  Compra protegida
                </span>
                <span className="flex flex-col items-center gap-2 px-1">
                  <CheckCircle2 className="h-5 w-5 text-[var(--brand-color)]" strokeWidth={1.7} />
                  Confirmação automática
                </span>
                <span className="flex flex-col items-center gap-2 px-1">
                  <LockKeyhole className="h-5 w-5 text-[var(--brand-color)]" strokeWidth={1.7} />
                  Privacidade garantida
                </span>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <section aria-label="Confiança Mercado Pago" className="mt-3 border-y border-white/[0.09] bg-[#050505]">
        <div className="mx-auto max-w-[900px] px-4 py-3 sm:px-6">
          <p className="text-center text-[12px] font-medium text-white/85">
            O Mercado Pago é a maior plataforma de pagamentos da América Latina.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:items-center sm:gap-8">
            <span className="flex items-center gap-3 text-[11px] leading-4 text-white/70">
              <ShieldCheck className="h-7 w-7 shrink-0 text-[var(--brand-color)]" strokeWidth={1.6} />
              Mais de 15 anos<br />de experiência
            </span>
            <span className="flex items-center gap-3 text-[11px] leading-4 text-white/70">
              <Globe2 className="h-7 w-7 shrink-0 text-[var(--brand-color)]" strokeWidth={1.6} />
              Presente em mais de<br />18 países
            </span>
            <span className="flex items-center gap-3 text-[11px] leading-4 text-white/70">
              <Info className="h-7 w-7 shrink-0 text-[var(--brand-color)]" strokeWidth={1.6} />
              Milhões de pessoas<br />e empresas confiam
            </span>
            <MercadoPagoBrand className="justify-self-center sm:justify-self-end" />
          </div>
        </div>
      </section>
    </div>
  );
}
