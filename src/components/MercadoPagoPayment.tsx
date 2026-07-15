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
  ArrowLeft,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
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
  const attemptIdRef = useRef<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePayment, setActivePayment] = useState<PaymentDetails | null>(
    null,
  );
  const activePaymentId = activePayment?.id;
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

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
            baseColor: "#A9EC17",
            baseColorFirstVariant: "#B8FF28",
            baseColorSecondVariant: "#86BE0F",
            buttonTextColor: "#050505",
            formBackgroundColor: "#0D0D0D",
            inputBackgroundColor: "#080808",
            textPrimaryColor: "#FFFFFF",
            textSecondaryColor: "#9A9A9A",
            outlinePrimaryColor: "#333333",
            outlineSecondaryColor: "#A9EC17",
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
          router.replace(`/pedido/${order.orderId}/sucesso`);
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
  }, [order.orderId, router]);

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
          router.replace(`/pedido/${order.orderId}/sucesso`);
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
  }, [activePaymentId, order.orderId, router]);

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
          router.replace(`/pedido/${order.orderId}/sucesso`);
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
    [order.orderId, router],
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
    <div className="mx-auto max-w-[1240px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Link
        href="/checkout"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#A9EC17] transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos dados do pedido
      </Link>

      <header className="mt-5 border-b border-white/[0.08] pb-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A9EC17]">
          Pagamento seguro
        </p>
        <h1 className="font-display mt-2 text-[30px] font-extrabold leading-tight text-white sm:text-[38px]">
          Escolha como pagar
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Finalize sem sair da EcomZero. Seus dados financeiros são processados
          pelo Mercado Pago.
        </p>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-4 sm:p-7">
          <section
            aria-label="Pagamento processado pelo Mercado Pago"
            className="mb-5 rounded-xl border border-[#009EE3]/35 bg-[#009EE3]/[0.08] p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#009EE3] text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#66C9F2]">
                  Ambiente de pagamento seguro
                </p>
                <p className="font-display mt-1 text-lg font-extrabold text-white">
                  Pagamento processado pelo Mercado Pago
                </p>
                <p className="mt-1 text-[11px] leading-5 text-white/55">
                  Seus dados de pagamento são protegidos e processados pela
                  infraestrutura do Mercado Pago.
                </p>
              </div>
            </div>
          </section>
          {isCheckingPayment ? (
            <div className="flex min-h-[320px] items-center justify-center gap-3 text-sm text-white/50">
              <LoaderCircle className="h-5 w-5 animate-spin text-[#A9EC17]" />
              Consultando pagamento...
            </div>
          ) : activePayment ? (
            <section className="mx-auto max-w-[600px] py-3 text-center">
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
                          baseColor: "#A9EC17",
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
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#A9EC17]/20 bg-[#A9EC17]/10 text-[#A9EC17]">
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
                      className="h-12 min-w-0 flex-1 rounded-md border border-white/[0.14] bg-[#080808] px-3 text-xs text-white/65 outline-none focus:border-[#A9EC17]"
                    />
                    <button
                      type="button"
                      onClick={copyPixCode}
                      className="font-display inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#A9EC17] px-4 text-[11px] font-extrabold uppercase text-black transition hover:bg-[#B8FF28]"
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

              <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-[#A9EC17]/15 bg-[#A9EC17]/[0.05] px-4 py-3 text-[11px] text-white/55">
                <LoaderCircle className="h-4 w-4 animate-spin text-[#A9EC17]" />
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
                  className="mb-5 flex gap-2 rounded-md border border-red-400/20 bg-red-400/[0.06] p-3 text-[11px] leading-5 text-red-200"
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

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5">
            <h2 className="font-display text-lg font-bold text-white">
              Resumo do pedido
            </h2>
            <div className="mt-5 space-y-3 border-b border-white/[0.08] pb-5">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-white">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="48px"
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-white/80">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/38">
                      {item.quantity} un. · {item.variant}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <dl className="mt-5 space-y-3 text-[12px]">
              <div className="flex justify-between gap-4 text-white/55">
                <dt>Subtotal</dt>
                <dd className="font-medium text-white">
                  {formatPrice(order.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-white/55">
                <dt>Frete</dt>
                <dd className="font-medium text-white">
                  {formatPrice(order.shipping)}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex items-end justify-between border-t border-white/[0.09] pt-5">
              <span className="font-display text-xs font-bold uppercase text-white">
                Total
              </span>
              <strong className="font-display text-[25px] font-extrabold text-[#A9EC17]">
                {formatPrice(order.total)}
              </strong>
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-[10px] text-white/38">
              <LockKeyhole className="h-3.5 w-3.5 text-[#A9EC17]" />
              Pagamento criptografado e processado pelo Mercado Pago
            </p>
          </section>

          <section className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-4 text-[10px] text-white/50">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#A9EC17]" />
              Compra protegida
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#A9EC17]" />
              Confirmação automática
            </span>
          </section>
        </aside>
      </div>
    </div>
  );
}
