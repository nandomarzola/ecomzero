"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Truck,
} from "lucide-react";
import CheckoutShippingStep from "@/components/CheckoutShippingStep";
import PaymentBadges from "@/components/PaymentBadges";
import {
  clearCheckoutShippingSelection,
  getCheckoutShippingSnapshot,
  isCheckoutShippingExpired,
  parseCheckoutShippingSelection,
  subscribeCheckoutShippingSelection,
} from "@/lib/client/checkoutShippingStorage";
import { checkoutSchema } from "@/lib/validation/checkout";

type CheckoutFormProps = {
  isLoggedIn: boolean;
  sessionName: string;
  sessionEmail: string;
  cartSubtotal: number;
  initialCep: string;
};

type FormValues = {
  nome: string;
  email: string;
  telefone: string;
  cpfCnpj: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

type FormField = keyof FormValues;
type FieldErrors = Partial<Record<FormField, string>>;

type SavedAddress = {
  id: string;
  apelido: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  padrao: boolean;
};

const emptyForm: FormValues = {
  nome: "",
  email: "",
  telefone: "",
  cpfCnpj: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

const inputClassName =
  "h-12 w-full rounded-md border border-white/[0.14] bg-[#080808] px-4 text-sm text-white outline-none transition placeholder:text-white/28 hover:border-white/25 focus:border-[#A9EC17] focus:ring-1 focus:ring-[#A9EC17] aria-[invalid=true]:border-red-400/80 aria-[invalid=true]:focus:ring-red-400/60";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatCep = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatDocument = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

function Field({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
  ...inputProps
}: {
  id: FormField;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange" | "onBlur">) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[12px] font-semibold text-white/85">
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={inputClassName}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-[11px] text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export default function CheckoutForm({
  isLoggedIn,
  sessionName,
  sessionEmail,
  cartSubtotal,
  initialCep,
}: CheckoutFormProps) {
  const [values, setValues] = useState<FormValues>({
    ...emptyForm,
    nome: sessionName,
    email: sessionEmail,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const storedRaw = useSyncExternalStore(
    subscribeCheckoutShippingSelection,
    getCheckoutShippingSnapshot,
    () => undefined,
  );
  const storedSelection = useMemo(
    () =>
      storedRaw === undefined
        ? undefined
        : parseCheckoutShippingSelection(storedRaw),
    [storedRaw],
  );
  const [cepOverride, setCepOverride] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(isLoggedIn);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [cepLookupStatus, setCepLookupStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [cepLookupMessage, setCepLookupMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const selectionMatchesCart = Boolean(
    storedSelection &&
      Math.abs(storedSelection.cartSubtotal - cartSubtotal) < 0.005,
  );
  const selection = selectionMatchesCart ? (storedSelection ?? null) : null;
  const storageReady = storedSelection !== undefined;

  useEffect(() => {
    if (storedSelection && !selectionMatchesCart) {
      clearCheckoutShippingSelection();
    }
  }, [selectionMatchesCart, storedSelection]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const loadAccount = async () => {
      try {
        const [profileResponse, addressResponse] = await Promise.all([
          fetch("/api/account/profile", { cache: "no-store" }),
          fetch("/api/account/addresses", { cache: "no-store" }),
        ]);
        if (profileResponse.ok) {
          const profile = (await profileResponse.json()) as {
            nome: string;
            email: string;
            telefone: string | null;
          };
          setValues((current) => ({
            ...current,
            nome: current.nome || profile.nome,
            email: current.email || profile.email,
            telefone: current.telefone || formatPhone(profile.telefone ?? ""),
          }));
        }
        if (addressResponse.ok) {
          const payload = (await addressResponse.json()) as { addresses: SavedAddress[] };
          setAddresses(payload.addresses);
        }
      } finally {
        setIsLoadingAccount(false);
      }
    };

    void loadAccount();
  }, [isLoggedIn]);

  const selectionExpired = Boolean(
    storedSelection && isCheckoutShippingExpired(storedSelection, now),
  );
  const effectiveCep = cepOverride ?? formatCep(selection?.cep ?? "");
  const cepDigits = onlyDigits(effectiveCep);
  const cepMatchesShipping = selection
    ? onlyDigits(effectiveCep) === selection.cep
    : false;
  const payload = useMemo(
    () => ({
      ...values,
      cep: effectiveCep,
      shippingQuoteId: selection?.quoteId ?? "",
      shippingOptionId: selection?.optionId ?? "",
    }),
    [effectiveCep, selection, values],
  );
  const total = (selection?.cartSubtotal ?? 0) + (selection?.preco ?? 0);

  useEffect(() => {
    if (cepDigits.length !== 8 || selectedAddressId) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCepLookupStatus("loading");
      setCepLookupMessage("");
      try {
        const response = await fetch(`/api/address/cep/${cepDigits}`, {
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | {
              logradouro?: string;
              bairro?: string;
              cidade?: string;
              uf?: string;
              error?: string;
            }
          | null;
        if (!response.ok || !data) {
          throw new Error(data?.error ?? "Não foi possível consultar o CEP.");
        }

        setValues((current) => ({
          ...current,
          logradouro: data.logradouro ?? "",
          bairro: data.bairro ?? "",
          cidade: data.cidade ?? "",
          uf: data.uf ?? "",
        }));
        setErrors((current) => ({
          ...current,
          cep: undefined,
          logradouro: undefined,
          bairro: undefined,
          cidade: undefined,
          uf: undefined,
        }));
        setCepLookupStatus("success");
        setCepLookupMessage("Endereço encontrado. Confira e informe o número.");
        window.setTimeout(() => {
          document.getElementById("numero")?.focus();
        }, 100);
      } catch (error) {
        if (controller.signal.aborted) return;
        setCepLookupStatus("error");
        setCepLookupMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível consultar o CEP.",
        );
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cepDigits, selectedAddressId]);

  const updateField = (field: FormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setStatusMessage("");
  };

  const validateField = (field: FormField) => {
    const parsed = checkoutSchema.safeParse(payload);
    if (parsed.success) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
      return;
    }
    const issue = parsed.error.issues.find((item) => item.path[0] === field);
    setErrors((current) => ({ ...current, [field]: issue?.message }));
  };

  const selectAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;
    setValues((current) => ({
      ...current,
      logradouro: address.logradouro,
      numero: address.numero,
      complemento: address.complemento ?? "",
      bairro: address.bairro,
      cidade: address.cidade,
      uf: address.uf,
    }));
    setCepOverride(formatCep(address.cep));
    setErrors({});
    setStatusMessage("");
    setCepLookupStatus("idle");
    setCepLookupMessage("");
  };

  const createPaymentPreference = async (orderId: string) => {
    const response = await fetch(`/api/orders/${orderId}/payment-preference`, {
      method: "POST",
    });
    const data = (await response.json().catch(() => null)) as
      | { initPoint?: string; error?: string }
      | null;
    if (!response.ok || !data?.initPoint) {
      throw new Error(
        data?.error ?? "Não foi possível abrir o pagamento. Tente novamente.",
      );
    }
    clearCheckoutShippingSelection();
    window.location.assign(data.initPoint);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("");

    if (createdOrderId) {
      setIsSubmitting(true);
      try {
        await createPaymentPreference(createdOrderId);
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.",
        );
        setIsSubmitting(false);
      }
      return;
    }

    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && field in emptyForm && !nextErrors[field as FormField]) {
          nextErrors[field as FormField] = issue.message;
        }
      }
      setErrors(nextErrors);
      setStatusMessage("Revise os campos destacados para continuar.");
      return;
    }

    if (!selection || selectionExpired || !cepMatchesShipping) {
      setStatusMessage("Volte ao carrinho e recalcule o frete para este CEP.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderResponse = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const orderData = (await orderResponse.json().catch(() => null)) as
        | { orderId?: string; error?: string }
        | null;

      if (!orderResponse.ok || !orderData?.orderId) {
        const message = orderData?.error ?? "Não foi possível criar seu pedido.";
        if (/cota[cç][aã]o|frete/i.test(message)) {
          clearCheckoutShippingSelection();
        }
        throw new Error(message);
      }

      setCreatedOrderId(orderData.orderId);
      await createPaymentPreference(orderData.orderId);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Não foi possível finalizar o pedido.",
      );
      setIsSubmitting(false);
    }
  };

  if (!storageReady) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <LoaderCircle className="h-7 w-7 animate-spin text-[#A9EC17]" />
      </div>
    );
  }

  if (!selection) {
    return (
      <CheckoutShippingStep subtotal={cartSubtotal} initialCep={initialCep} />
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Link
        href="/carrinho"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#A9EC17] transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao carrinho
      </Link>

      <header className="mt-5 border-b border-white/[0.08] pb-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A9EC17]">
          Checkout seguro
        </p>
        <h1 className="font-display mt-2 text-[30px] font-extrabold leading-tight text-white sm:text-[38px]">
          Finalize sua compra
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Confira seus dados antes de seguir para o ambiente do Mercado Pago.
        </p>
      </header>

      <form className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" noValidate onSubmit={handleSubmit}>
        <div className="space-y-5">
          <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A9EC17]/10 text-[#A9EC17]">
                <Check className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-white">Dados do cliente</h2>
                <p className="text-[11px] text-white/42">Usados na identificação e no contato do pedido.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="nome" label="Nome completo" value={values.nome} error={errors.nome} autoComplete="name" placeholder="Digite seu nome completo" onChange={(value) => updateField("nome", value)} onBlur={() => validateField("nome")} />
              <Field id="email" label="E-mail" value={values.email} error={errors.email} type="email" inputMode="email" autoComplete="email" placeholder="voce@email.com" onChange={(value) => updateField("email", value)} onBlur={() => validateField("email")} />
              <Field id="telefone" label="Telefone / WhatsApp" value={values.telefone} error={errors.telefone} type="tel" inputMode="numeric" autoComplete="tel" placeholder="(11) 99999-9999" maxLength={15} onChange={(value) => updateField("telefone", formatPhone(value))} onBlur={() => validateField("telefone")} />
              <Field id="cpfCnpj" label="CPF ou CNPJ" value={values.cpfCnpj} error={errors.cpfCnpj} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={18} onChange={(value) => updateField("cpfCnpj", formatDocument(value))} onBlur={() => validateField("cpfCnpj")} />
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A9EC17]/10 text-[#A9EC17]">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-white">Endereço de entrega</h2>
                <p className="text-[11px] text-white/42">O CEP deve ser o mesmo usado na cotação.</p>
              </div>
            </div>

            {isLoggedIn && (
              <div className="mt-5">
                <label htmlFor="saved-address" className="mb-2 block text-[12px] font-semibold text-white/85">
                  Usar endereço salvo
                </label>
                <select
                  id="saved-address"
                  value={selectedAddressId}
                  disabled={isLoadingAccount || addresses.length === 0}
                  onChange={(event) => selectAddress(event.target.value)}
                  className={`${inputClassName} disabled:cursor-not-allowed disabled:text-white/35`}
                >
                  <option value="">
                    {isLoadingAccount
                      ? "Carregando seus endereços..."
                      : addresses.length > 0
                        ? "Digitar um novo endereço"
                        : "Nenhum endereço salvo"}
                  </option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.apelido || "Endereço"}{address.padrao ? " · padrão" : ""} — {address.logradouro}, {address.numero}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Field id="cep" label="CEP" value={effectiveCep} error={errors.cep} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" maxLength={9} onChange={(value) => { setCepOverride(formatCep(value)); setValues((current) => ({ ...current, logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" })); setErrors((current) => ({ ...current, cep: undefined })); setStatusMessage(""); setSelectedAddressId(""); setCepLookupStatus("idle"); setCepLookupMessage(""); }} onBlur={() => validateField("cep")} />
              </div>
              <div className="sm:col-span-4">
                <Field id="logradouro" label="Logradouro" value={values.logradouro} error={errors.logradouro} autoComplete="address-line1" placeholder="Rua, avenida..." onChange={(value) => updateField("logradouro", value)} onBlur={() => validateField("logradouro")} />
              </div>
              <div className="sm:col-span-2">
                <Field id="numero" label="Número" value={values.numero} error={errors.numero} autoComplete="address-line2" placeholder="123" onChange={(value) => updateField("numero", value)} onBlur={() => validateField("numero")} />
              </div>
              <div className="sm:col-span-4">
                <Field id="complemento" label="Complemento (opcional)" value={values.complemento} error={errors.complemento} autoComplete="address-line3" placeholder="Apartamento, bloco, referência" onChange={(value) => updateField("complemento", value)} onBlur={() => validateField("complemento")} />
              </div>
              <div className="sm:col-span-3">
                <Field id="bairro" label="Bairro" value={values.bairro} error={errors.bairro} placeholder="Seu bairro" onChange={(value) => updateField("bairro", value)} onBlur={() => validateField("bairro")} />
              </div>
              <div className="sm:col-span-2">
                <Field id="cidade" label="Cidade" value={values.cidade} error={errors.cidade} autoComplete="address-level2" placeholder="Sua cidade" onChange={(value) => updateField("cidade", value)} onBlur={() => validateField("cidade")} />
              </div>
              <div className="sm:col-span-1">
                <Field id="uf" label="UF" value={values.uf} error={errors.uf} autoComplete="address-level1" placeholder="SP" maxLength={2} onChange={(value) => updateField("uf", value.replace(/[^A-Za-z]/g, "").toUpperCase())} onBlur={() => validateField("uf")} />
              </div>
            </div>

            {cepLookupStatus !== "idle" && (
              <p
                role={cepLookupStatus === "error" ? "alert" : "status"}
                className={`mt-4 flex items-center gap-2 text-[11px] leading-5 ${
                  cepLookupStatus === "error"
                    ? "text-red-300"
                    : cepLookupStatus === "success"
                      ? "text-[#A9EC17]"
                      : "text-white/50"
                }`}
              >
                {cepLookupStatus === "loading" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : cepLookupStatus === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {cepLookupStatus === "loading"
                  ? "Buscando endereço pelo CEP..."
                  : cepLookupMessage}
              </p>
            )}

            {!cepMatchesShipping && (
              <p role="alert" className="mt-4 flex gap-2 rounded-md border border-amber-300/20 bg-amber-300/[0.06] p-3 text-[11px] leading-5 text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                Este CEP é diferente do cotado. Volte ao carrinho e recalcule o frete para continuar.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5">
            <h2 className="font-display text-lg font-bold text-white">Resumo do pedido</h2>
            <dl className="mt-5 space-y-3 text-[12px]">
              <div className="flex justify-between gap-4 text-white/60">
                <dt>Subtotal</dt>
                <dd className="font-medium text-white">{formatPrice(selection.cartSubtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-white/60">
                <dt>Frete</dt>
                <dd className="font-medium text-white">{formatPrice(selection.preco)}</dd>
              </div>
            </dl>
            <div className="mt-5 flex items-end justify-between border-t border-white/[0.09] pt-5">
              <span className="font-display text-xs font-bold uppercase text-white">Total</span>
              <strong className="font-display text-[25px] font-extrabold text-[#A9EC17]">{formatPrice(total)}</strong>
            </div>
            <div className="mt-5 flex gap-3 rounded-lg border border-white/[0.08] bg-black/30 p-3">
              <Truck className="h-4 w-4 shrink-0 text-[#A9EC17]" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-white">{selection.transportadora} · {selection.servico}</p>
                <p className="mt-0.5 text-[10px] text-white/45">Entrega em até {selection.prazoDias} dias úteis</p>
              </div>
            </div>

            {selectionExpired && (
              <p role="alert" className="mt-4 flex gap-2 text-[11px] leading-5 text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                Sua cotação expirou. Volte ao carrinho e calcule novamente.
              </p>
            )}
            {statusMessage && (
              <p role="alert" className="mt-4 flex gap-2 rounded-md border border-red-400/20 bg-red-400/[0.06] p-3 text-[11px] leading-5 text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {statusMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="font-display mt-5 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-md bg-[#A9EC17] px-5 text-xs font-extrabold uppercase text-black transition hover:bg-[#B8FF28] disabled:cursor-not-allowed disabled:bg-[#A9EC17]/10 disabled:text-white/35"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Abrindo pagamento
                </>
              ) : createdOrderId ? (
                "Tentar pagamento novamente"
              ) : (
                <>
                  Ir para pagamento
                  <LockKeyhole className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-white/38">
              <ShieldCheck className="h-3.5 w-3.5 text-[#A9EC17]" />
              Pagamento processado no ambiente seguro do Mercado Pago.
            </p>
          </section>
          <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5">
            <PaymentBadges />
          </section>
        </aside>
      </form>
    </div>
  );
}
