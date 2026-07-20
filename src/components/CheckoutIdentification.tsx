"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Headphones,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { toast } from "sonner";
import CheckoutSteps from "@/components/checkout/CheckoutSteps";
import OAuthButtons from "@/components/OAuthButtons";
import TrustBadges from "@/components/TrustBadges";
import { registerCheckoutAccountAction } from "@/lib/actions/checkoutRegistrationAction";
import type { OAuthAvailability } from "@/lib/security/oauth";

const inputClassName =
  "h-12 w-full rounded-md border border-white/[0.15] bg-[#080808] pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-white/35 hover:border-white/25 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)] aria-[invalid=true]:border-red-400/80 max-md:h-[52px] max-md:text-base";

const trustBadges = [
  {
    icon: ShieldCheck,
    title: "Compra 100% segura",
    detail: "Seus dados protegidos",
  },
  {
    icon: Truck,
    title: "Frete rápido",
    detail: "Para todo o Brasil",
  },
  {
    icon: RefreshCw,
    title: "Troca garantida",
    detail: "Até 7 dias após o recebimento",
  },
  {
    icon: Headphones,
    title: "Atendimento humano",
    detail: "Suporte rápido e dedicado",
  },
];

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

type MobileMode = "login" | "register";
type MobileRegistrationField = "nome" | "email" | "telefone";
type MobileRegistrationErrors = Partial<
  Record<MobileRegistrationField, string>
>;

type CheckoutIdentificationProps = {
  oauthAvailability: OAuthAvailability;
};

export default function CheckoutIdentification({
  oauthAvailability,
}: CheckoutIdentificationProps) {
  const [activeMobileMode, setActiveMobileMode] =
    useState<MobileMode>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [registrationName, setRegistrationName] = useState("");
  const [registrationPhone, setRegistrationPhone] = useState("");
  const [mobileRegistrationErrors, setMobileRegistrationErrors] =
    useState<MobileRegistrationErrors>({});
  const [mobileRegistrationStatus, setMobileRegistrationStatus] =
    useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");

    if (!isValidEmail(loginEmail) || !password) {
      setLoginError("Informe seu e-mail e sua senha para continuar.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await signIn("credentials", {
        email: loginEmail,
        senha: password,
        redirect: false,
      });

      if (!result.ok) {
        setLoginError("E-mail ou senha incorretos.");
        return;
      }

      window.location.assign("/checkout");
    } catch {
      setLoginError("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegistrationError("");

    if (!isValidEmail(registrationEmail)) {
      setRegistrationError("Informe um e-mail válido para criar sua conta.");
      return;
    }

    const params = new URLSearchParams({
      email: registrationEmail.trim(),
      retorno: "/checkout",
    });
    window.location.assign(`/cadastro?${params.toString()}`);
  };

  const clearMobileRegistrationError = (field: MobileRegistrationField) => {
    setMobileRegistrationErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setMobileRegistrationStatus("");
  };

  const handleMobileCreateAccount = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const nextErrors: MobileRegistrationErrors = {};
    const phoneDigits = registrationPhone.replace(/\D/g, "");

    if (registrationName.trim().length < 2) {
      nextErrors.nome = "Informe seu nome completo.";
    }
    if (!isValidEmail(registrationEmail)) {
      nextErrors.email = "Informe um e-mail válido.";
    }
    if (!/^[1-9]{2}9\d{8}$/.test(phoneDigits)) {
      nextErrors.telefone = "Informe um celular válido com DDD.";
    }

    setMobileRegistrationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setMobileRegistrationStatus("Revise os campos destacados.");
      return;
    }

    setIsRegistering(true);
    setMobileRegistrationStatus("");
    try {
      const result = await registerCheckoutAccountAction({
        nome: registrationName,
        email: registrationEmail,
        telefone: registrationPhone,
      });

      if (!result.ok) {
        if (result.field) {
          setMobileRegistrationErrors({ [result.field]: result.error });
        }
        if (result.accountCreated) {
          setLoginEmail(registrationEmail.trim());
          setLoginError(result.error);
          setActiveMobileMode("login");
        } else {
          setMobileRegistrationStatus(result.error);
        }
        return;
      }

      window.location.assign("/checkout");
    } catch {
      setMobileRegistrationStatus(
        "Não foi possível criar sua conta agora. Tente novamente.",
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const showUnavailableMessage = (feature: string) => {
    toast.info(`${feature} estará disponível em breve.`);
  };

  return (
    <div data-checkout-identification-page className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-[1320px] px-4 pb-14 pt-6 sm:px-6 sm:pb-16 lg:px-8">
        <Link
          href="/carrinho"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--brand-color)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] sm:text-sm max-md:min-h-11 max-md:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o carrinho
        </Link>

        <header className="mt-7">
          <h1 className="font-display text-[30px] font-extrabold leading-tight text-white sm:text-[38px] max-md:text-[28px]">
            Finalizar compra
          </h1>
          <p className="mt-1.5 text-sm text-white/58 sm:text-base">
            Faça login ou crie sua conta para continuar.
          </p>
        </header>

        <CheckoutSteps current={1} />

        <div
          className="checkout-identification-tabs md:hidden"
          role="tablist"
          aria-label="Escolha como continuar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMobileMode === "login"}
            aria-controls="checkout-login-panel"
            data-active={activeMobileMode === "login"}
            className="checkout-identification-tab"
            onClick={() => setActiveMobileMode("login")}
          >
            Já sou cliente
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMobileMode === "register"}
            aria-controls="checkout-register-panel"
            data-active={activeMobileMode === "register"}
            className="checkout-identification-tab"
            onClick={() => setActiveMobileMode("register")}
          >
            Criar conta
          </button>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-2 lg:items-stretch max-md:mt-3">
          <section
            id="checkout-login-panel"
            aria-labelledby="checkout-login-title"
            className={`rounded-xl border border-white/[0.12] bg-[linear-gradient(145deg,#101010,#0A0A0A)] p-5 sm:p-7 max-md:p-4 ${activeMobileMode === "login" ? "max-md:block" : "max-md:hidden"}`}
          >
            <div className="flex items-center gap-4 max-md:hidden">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)] ring-1 ring-[var(--brand-color)]/15">
                <UserRound className="h-7 w-7" strokeWidth={1.7} />
              </span>
              <div>
                <h2 id="checkout-login-title" className="font-display text-lg font-bold text-white">
                  Já sou cliente
                </h2>
                <p className="mt-1 text-xs text-white/52 sm:text-sm max-md:text-sm">
                  Acesse sua conta para continuar.
                </p>
              </div>
            </div>

            <form className="mt-6 max-md:mt-0" noValidate onSubmit={handleLogin}>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
                  strokeWidth={1.7}
                />
                <input
                  id="checkout-login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(event) => {
                    setLoginEmail(event.target.value);
                    setLoginError("");
                  }}
                  placeholder="Seu e-mail"
                  aria-label="E-mail"
                  aria-invalid={Boolean(loginError)}
                  className={inputClassName}
                />
              </div>

              <div className="relative mt-3">
                <LockKeyhole
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
                  strokeWidth={1.7}
                />
                <input
                  id="checkout-login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setLoginError("");
                  }}
                  placeholder="Sua senha"
                  aria-label="Senha"
                  aria-invalid={Boolean(loginError)}
                  className={`${inputClassName} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/50 transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-color)]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <Link
                href="/recuperar-senha"
                className="mt-3 text-xs font-semibold text-[var(--brand-color)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] max-md:mt-2 max-md:inline-flex max-md:min-h-11 max-md:items-center max-md:text-base"
              >
                Esqueci minha senha
              </Link>

              {loginError && (
                <p
                  role="alert"
                  className="mt-4 rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200 max-md:text-base"
                >
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="store-primary-action font-display mt-5 flex min-h-12 w-full items-center justify-center px-5 text-xs font-extrabold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-65 max-md:min-h-[52px] max-md:text-base"
              >
                {isLoggingIn ? "Acessando..." : "Acessar conta"}
              </button>

              <div className="my-4 flex items-center gap-3 text-[11px] text-white/38 max-md:text-sm">
                <span className="h-px flex-1 bg-white/10" />
                <span>ou</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={() => showUnavailableMessage("O acesso sem senha")}
                className="font-display flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-[var(--brand-color)]/55 px-5 text-xs font-bold uppercase text-[var(--brand-color)] transition hover:bg-[var(--brand-color)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] max-md:min-h-[52px] max-md:text-base"
              >
                Entrar sem senha
                <MessageSquareText className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </form>
          </section>

          <section
            id="checkout-register-panel"
            aria-labelledby="checkout-register-title"
            className={`flex flex-col rounded-xl border border-white/[0.12] bg-[linear-gradient(145deg,#101010,#0A0A0A)] p-5 sm:p-7 max-md:p-4 ${activeMobileMode === "register" ? "max-md:flex" : "max-md:hidden"}`}
          >
            <div className="flex items-center gap-4 max-md:hidden">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)] ring-1 ring-[var(--brand-color)]/15">
                <UserRoundPlus className="h-7 w-7" strokeWidth={1.7} />
              </span>
              <div>
                <h2 id="checkout-register-title" className="font-display text-lg font-bold text-white">
                  Criar conta
                </h2>
                <p className="mt-1 text-xs text-white/52 sm:text-sm max-md:text-sm">
                  É rápido, fácil e seguro.
                </p>
              </div>
            </div>

            <form className="mt-6 max-md:hidden" noValidate onSubmit={handleCreateAccount}>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
                  strokeWidth={1.7}
                />
                <input
                  id="checkout-registration-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={registrationEmail}
                  onChange={(event) => {
                    setRegistrationEmail(event.target.value);
                    setRegistrationError("");
                  }}
                  placeholder="Informe seu e-mail"
                  aria-label="E-mail para criar conta"
                  aria-invalid={Boolean(registrationError)}
                  className={inputClassName}
                />
              </div>
              {registrationError && (
                <p role="alert" className="mt-2 text-xs text-red-300">
                  {registrationError}
                </p>
              )}
              <button
                type="submit"
                className="store-primary-action font-display mt-4 flex min-h-12 w-full items-center justify-center px-5 text-xs font-extrabold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white max-md:min-h-[52px] max-md:text-sm"
              >
                Criar conta e continuar
              </button>
            </form>

            <form
              className="hidden max-md:block"
              noValidate
              onSubmit={handleMobileCreateAccount}
            >
              <div className="relative">
                <UserRound
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
                  strokeWidth={1.7}
                />
                <input
                  id="checkout-mobile-registration-name"
                  type="text"
                  autoComplete="name"
                  value={registrationName}
                  onChange={(event) => {
                    setRegistrationName(event.target.value);
                    clearMobileRegistrationError("nome");
                  }}
                  placeholder="Nome completo"
                  aria-label="Nome completo"
                  aria-invalid={Boolean(mobileRegistrationErrors.nome)}
                  className={inputClassName}
                />
              </div>
              {mobileRegistrationErrors.nome && (
                <p role="alert" className="mt-2 text-base text-red-300">
                  {mobileRegistrationErrors.nome}
                </p>
              )}

              <div className="relative mt-3">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
                  strokeWidth={1.7}
                />
                <input
                  id="checkout-mobile-registration-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={registrationEmail}
                  onChange={(event) => {
                    setRegistrationEmail(event.target.value);
                    clearMobileRegistrationError("email");
                  }}
                  placeholder="Seu e-mail"
                  aria-label="E-mail"
                  aria-invalid={Boolean(mobileRegistrationErrors.email)}
                  className={inputClassName}
                />
              </div>
              {mobileRegistrationErrors.email && (
                <p role="alert" className="mt-2 text-base text-red-300">
                  {mobileRegistrationErrors.email}
                </p>
              )}

              <div className="relative mt-3">
                <Phone
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
                  strokeWidth={1.7}
                />
                <input
                  id="checkout-mobile-registration-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={registrationPhone}
                  onChange={(event) => {
                    setRegistrationPhone(formatPhone(event.target.value));
                    clearMobileRegistrationError("telefone");
                  }}
                  placeholder="WhatsApp com DDD"
                  aria-label="Telefone ou WhatsApp"
                  aria-invalid={Boolean(mobileRegistrationErrors.telefone)}
                  className={inputClassName}
                />
              </div>
              {mobileRegistrationErrors.telefone && (
                <p role="alert" className="mt-2 text-base text-red-300">
                  {mobileRegistrationErrors.telefone}
                </p>
              )}

              {mobileRegistrationStatus && (
                <p
                  role="alert"
                  className="mt-4 rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-base text-red-200"
                >
                  {mobileRegistrationStatus}
                </p>
              )}

              <p className="mt-4 text-base leading-6 text-white/55">
                Enviaremos uma senha temporária segura para seu e-mail. Você já continuará conectado.
              </p>

              <button
                type="submit"
                disabled={isRegistering}
                className="store-primary-action font-display mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 px-5 text-base font-extrabold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-65"
              >
                {isRegistering && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {isRegistering ? "Criando conta..." : "Criar conta e continuar"}
              </button>
            </form>

            <div className="mt-7 border-t border-white/10 pt-7 sm:mt-auto max-md:hidden">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)]">
                  <ShieldCheck className="h-6 w-6" strokeWidth={1.7} />
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold text-white sm:text-base">
                    Comprar com segurança
                  </h3>
                  <p className="mt-1.5 max-w-md text-xs leading-5 text-white/52 sm:text-sm sm:leading-6">
                    Seus dados são protegidos com criptografia e não compartilhamos
                    suas informações.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section
          aria-labelledby="social-access-title"
          className="mt-5 rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5 sm:p-6 max-md:p-4"
        >
          <div className="text-center">
            <h2 id="social-access-title" className="font-display text-sm font-bold text-white sm:text-base">
              Ou acesse com suas redes sociais
            </h2>
            <p className="mt-1 text-xs text-white/48">
              É rápido e você não precisa lembrar de senhas.
            </p>
          </div>
          <div className="mx-auto mt-5 max-w-[760px]">
            <OAuthButtons
              availability={oauthAvailability}
              callbackUrl="/checkout"
            />
          </div>
        </section>

        <TrustBadges items={trustBadges} className="mt-5 grid-cols-2 lg:grid-cols-4" />
      </div>
    </div>
  );
}
