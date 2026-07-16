"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Headphones,
  LockKeyhole,
  Mail,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { toast } from "sonner";
import TrustBadges from "@/components/TrustBadges";

const inputClassName =
  "h-12 w-full rounded-md border border-white/[0.15] bg-[#080808] pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-white/35 hover:border-white/25 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)] aria-[invalid=true]:border-red-400/80";

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

export default function CheckoutIdentification() {
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [registrationError, setRegistrationError] = useState("");

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

  const showUnavailableMessage = (feature: string) => {
    toast.info(`${feature} estará disponível em breve.`);
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-[1320px] px-4 pb-14 pt-6 sm:px-6 sm:pb-16 lg:px-8">
        <Link
          href="/carrinho"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--brand-color)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o carrinho
        </Link>

        <header className="mt-7">
          <h1 className="font-display text-[30px] font-extrabold leading-tight text-white sm:text-[38px]">
            Finalizar compra
          </h1>
          <p className="mt-1.5 text-sm text-white/58 sm:text-base">
            Faça login ou crie sua conta para continuar.
          </p>
        </header>

        <div className="mt-7 grid gap-5 lg:grid-cols-2 lg:items-stretch">
          <section
            aria-labelledby="checkout-login-title"
            className="rounded-xl border border-white/[0.12] bg-[linear-gradient(145deg,#101010,#0A0A0A)] p-5 sm:p-7"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)] ring-1 ring-[var(--brand-color)]/15">
                <UserRound className="h-7 w-7" strokeWidth={1.7} />
              </span>
              <div>
                <h2 id="checkout-login-title" className="font-display text-lg font-bold text-white">
                  Já sou cliente
                </h2>
                <p className="mt-1 text-xs text-white/52 sm:text-sm">
                  Acesse sua conta para continuar.
                </p>
              </div>
            </div>

            <form className="mt-6" noValidate onSubmit={handleLogin}>
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

              <button
                type="button"
                onClick={() => showUnavailableMessage("A recuperação de senha")}
                className="mt-3 text-xs font-semibold text-[var(--brand-color)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
              >
                Esqueci minha senha
              </button>

              {loginError && (
                <p
                  role="alert"
                  className="mt-4 rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200"
                >
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="font-display mt-5 flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--brand-color)] px-5 text-xs font-extrabold uppercase text-black transition hover:bg-[#B8FF28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-65"
              >
                {isLoggingIn ? "Acessando..." : "Acessar conta"}
              </button>

              <div className="my-4 flex items-center gap-3 text-[11px] text-white/38">
                <span className="h-px flex-1 bg-white/10" />
                <span>ou</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={() => showUnavailableMessage("O acesso sem senha")}
                className="font-display flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-[var(--brand-color)]/55 px-5 text-xs font-bold uppercase text-[var(--brand-color)] transition hover:bg-[var(--brand-color)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
              >
                Entrar sem senha
                <MessageSquareText className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </form>
          </section>

          <section
            aria-labelledby="checkout-register-title"
            className="flex flex-col rounded-xl border border-white/[0.12] bg-[linear-gradient(145deg,#101010,#0A0A0A)] p-5 sm:p-7"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)] ring-1 ring-[var(--brand-color)]/15">
                <UserRoundPlus className="h-7 w-7" strokeWidth={1.7} />
              </span>
              <div>
                <h2 id="checkout-register-title" className="font-display text-lg font-bold text-white">
                  Criar conta
                </h2>
                <p className="mt-1 text-xs text-white/52 sm:text-sm">
                  É rápido, fácil e seguro.
                </p>
              </div>
            </div>

            <form className="mt-6" noValidate onSubmit={handleCreateAccount}>
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
                className="font-display mt-4 flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--brand-color)] px-5 text-xs font-extrabold uppercase text-black transition hover:bg-[#B8FF28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Criar conta e continuar
              </button>
            </form>

            <div className="mt-7 border-t border-white/10 pt-7 sm:mt-auto">
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
          className="mt-5 rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5 sm:p-6"
        >
          <div className="text-center">
            <h2 id="social-access-title" className="font-display text-sm font-bold text-white sm:text-base">
              Ou acesse com suas redes sociais
            </h2>
            <p className="mt-1 text-xs text-white/48">
              É rápido e você não precisa lembrar de senhas.
            </p>
          </div>
          <div className="mx-auto mt-5 grid max-w-[760px] gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => showUnavailableMessage("O acesso com Facebook")}
              className="relative flex min-h-12 items-center justify-center rounded-md border border-white/[0.14] bg-[#080808] px-12 text-sm font-medium text-white transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
            >
              <span className="absolute left-4 flex h-6 w-6 items-end justify-center rounded-full bg-[#1877F2] text-lg font-bold leading-[22px] text-white">
                f
              </span>
              Continuar com Facebook
            </button>
            <button
              type="button"
              onClick={() => showUnavailableMessage("O acesso com Google")}
              className="relative flex min-h-12 items-center justify-center rounded-md border border-white/[0.14] bg-[#080808] px-12 text-sm font-medium text-white transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
            >
              <span className="absolute left-4 bg-[conic-gradient(from_-45deg,#4285F4_0_25%,#34A853_0_45%,#FBBC05_0_70%,#EA4335_0)] bg-clip-text text-xl font-extrabold text-transparent">
                G
              </span>
              Continuar com Google
            </button>
          </div>
        </section>

        <TrustBadges items={trustBadges} className="mt-5 grid-cols-2 lg:grid-cols-4" />
      </div>
    </div>
  );
}
