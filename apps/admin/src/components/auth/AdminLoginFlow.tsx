"use client";

import { type FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  beginAdminLoginAction,
  cancelAdminLoginChallengeAction,
  resendAdminLoginCodeAction,
} from "@/lib/actions/adminLogin";

type LoginStep = "credentials" | "email-code" | "recovery-code";

type ChallengeState = {
  challengeToken: string;
  maskedEmail: string;
  expiresAt: string;
};

function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-1.5 text-[#A9EC17]">
      <svg
        aria-hidden="true"
        viewBox="0 0 88 58"
        className="h-9 w-14"
        fill="none"
      >
        <path d="M5 16h15M9 23h15M14 30h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path
          d="M24 9h8.5l4.4 28.1h34.6l8-22.6H35"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M37 15h41l-7.2 20H40.2L37 15Z" fill="currentColor" opacity="0.92" />
        <circle cx="43" cy="48" r="4.5" fill="currentColor" />
        <circle cx="68" cy="48" r="4.5" fill="currentColor" />
      </svg>
      <span className="font-display text-2xl font-extrabold tracking-[-0.06em]">
        ECOM<span className="text-white">ZERO</span>
      </span>
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-0.5 flex h-[52px] items-center justify-center gap-2 rounded-lg bg-[#A9EC17] px-5 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_10px_35px_rgba(169,236,23,0.13)] transition hover:bg-[#B8F52B] focus:outline-none focus:ring-2 focus:ring-[#A9EC17]/60 focus:ring-offset-2 focus:ring-offset-[#101110] disabled:cursor-wait disabled:opacity-65"
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export default function AdminLoginFlow({ initialError = false }: { initialError?: boolean }) {
  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    initialError ? "Não foi possível entrar. Verifique os dados informados." : "",
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((current) => Math.max(0, current - 1)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function finishSignIn(credentials: Record<string, string>) {
    const result = await signIn("credentials", {
      ...credentials,
      redirect: false,
      redirectTo: "/",
    });
    if (result?.error) {
      setError("Código inválido, expirado ou com tentativas esgotadas.");
      return false;
    }
    window.location.assign(result?.url ?? "/");
    return true;
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await beginAdminLoginAction({ email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.requiresVerification) {
        await finishSignIn({ email, password });
        return;
      }
      setChallenge({
        challengeToken: result.challengeToken,
        maskedEmail: result.maskedEmail,
        expiresAt: result.expiresAt,
      });
      setPassword("");
      setVerificationCode("");
      setCooldown(result.retryAfterSeconds);
      setStep("email-code");
    } catch {
      setError("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function submitEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setLoading(true);
    setError("");
    try {
      await finishSignIn({
        challengeToken: challenge.challengeToken,
        verificationCode,
      });
    } catch {
      setError("Não foi possível validar o código agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRecoveryCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setLoading(true);
    setError("");
    try {
      await finishSignIn({
        challengeToken: challenge.challengeToken,
        recoveryCode,
      });
    } catch {
      setError("Não foi possível validar o código de recuperação.");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!challenge || cooldown > 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await resendAdminLoginCodeAction({
        challengeToken: challenge.challengeToken,
      });
      if (!result.ok) {
        setError(result.error);
        setCooldown(result.retryAfterSeconds);
        return;
      }
      setChallenge({
        challengeToken: result.challengeToken,
        maskedEmail: result.maskedEmail,
        expiresAt: result.expiresAt,
      });
      setVerificationCode("");
      setCooldown(result.retryAfterSeconds);
    } catch {
      setError("Não foi possível reenviar o código agora.");
    } finally {
      setLoading(false);
    }
  }

  function returnToLogin() {
    if (challenge) {
      void cancelAdminLoginChallengeAction({
        challengeToken: challenge.challengeToken,
      });
    }
    setStep("credentials");
    setChallenge(null);
    setVerificationCode("");
    setRecoveryCode("");
    setCooldown(0);
    setError("");
  }

  const isCodeStep = step !== "credentials";

  return (
    <main className="admin-login-background relative flex min-h-dvh items-center justify-center overflow-y-auto px-4 py-4 sm:py-6">
      <section className="admin-login-card relative w-full max-w-[520px] overflow-hidden rounded-[20px] border border-white/[0.14] bg-[#101110] shadow-2xl shadow-black/70">
        <div className="px-5 py-7 sm:px-9 sm:py-8">
          <header className="flex flex-col items-center text-center">
            <BrandMark />
            <h1 className="font-display mt-5 text-[28px] font-bold leading-tight tracking-[-0.035em] text-white sm:text-[30px]">
              {step === "credentials"
                ? "Admin EcomZero"
                : step === "email-code"
                  ? "Verifique seu e-mail"
                  : "Código de recuperação"}
            </h1>
            <p className="mt-1.5 max-w-sm text-sm leading-5 text-white/50">
              {step === "credentials"
                ? "Acesso restrito ao painel."
                : step === "email-code"
                  ? `Enviamos um código de 6 dígitos para ${challenge?.maskedEmail ?? "seu e-mail"}.`
                  : "Use um dos códigos de recuperação salvos ao ativar o 2FA."}
            </p>
          </header>

          <div className="my-5 flex items-center gap-4">
            <span className="h-px flex-1 bg-white/[0.11]" />
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#A9EC17]/25 bg-[#A9EC17]/[0.06] text-[#A9EC17]">
              {isCodeStep ? <Mail className="h-[18px] w-[18px]" strokeWidth={1.9} /> : <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.9} />}
            </span>
            <span className="h-px flex-1 bg-white/[0.11]" />
          </div>

          {error ? (
            <p role="alert" aria-live="polite" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          {step === "credentials" ? (
            <form onSubmit={submitCredentials} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-white">
                E-mail
                <span className="relative block">
                  <UserRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A9EC17]" strokeWidth={1.8} />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Digite seu e-mail"
                    className="h-[52px] w-full rounded-lg border border-white/[0.18] bg-[#080908] pl-12 pr-4 text-sm font-normal text-white outline-none transition placeholder:text-white/38 focus:border-[#A9EC17]/60 focus:ring-2 focus:ring-[#A9EC17]/10"
                  />
                </span>
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-white">
                Senha
                <span className="relative block">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A9EC17]" strokeWidth={1.8} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite sua senha"
                    className="h-[52px] w-full rounded-lg border border-white/[0.18] bg-[#080908] pl-12 pr-12 text-sm font-normal text-white outline-none transition placeholder:text-white/38 focus:border-[#A9EC17]/60 focus:ring-2 focus:ring-[#A9EC17]/10"
                  />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </span>
              </label>

              <div className="flex justify-end">
                <span aria-disabled="true" title="Recuperação de senha disponível em breve" className="cursor-default text-xs font-medium text-[#A9EC17]/75">
                  Esqueci minha senha
                </span>
              </div>

              <SubmitButton loading={loading}>Entrar</SubmitButton>
            </form>
          ) : step === "email-code" ? (
            <form onSubmit={submitEmailCode} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-white">
                Código de verificação
                <span className="relative block">
                  <KeyRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A9EC17]" strokeWidth={1.8} />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Código de 6 dígitos"
                    className="h-[58px] w-full rounded-lg border border-white/[0.18] bg-[#080908] pl-12 pr-4 text-center text-xl font-bold tracking-[0.42em] text-white outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-white/38 focus:border-[#A9EC17]/60 focus:ring-2 focus:ring-[#A9EC17]/10"
                  />
                </span>
              </label>

              <SubmitButton loading={loading}>Confirmar código</SubmitButton>

              <button type="button" onClick={resendCode} disabled={loading || cooldown > 0} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.12] text-xs font-semibold text-white/65 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-45">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
              </button>

              <button type="button" onClick={() => { setError(""); setStep("recovery-code"); }} className="text-xs font-medium text-[#A9EC17]/80 transition hover:text-[#A9EC17]">
                Usar um código de recuperação
              </button>
              <button type="button" onClick={returnToLogin} className="flex items-center justify-center gap-1.5 text-xs text-white/45 transition hover:text-white/75">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Voltar para o login
              </button>
            </form>
          ) : (
            <form onSubmit={submitRecoveryCode} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-white">
                Código de recuperação
                <span className="relative block">
                  <KeyRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A9EC17]" strokeWidth={1.8} />
                  <input
                    type="text"
                    required
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={recoveryCode}
                    onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
                    placeholder="Digite seu código de recuperação"
                    className="h-[52px] w-full rounded-lg border border-white/[0.18] bg-[#080908] pl-12 pr-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-white outline-none transition placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-white/38 focus:border-[#A9EC17]/60 focus:ring-2 focus:ring-[#A9EC17]/10"
                  />
                </span>
              </label>

              <SubmitButton loading={loading}>Entrar com código</SubmitButton>
              <button type="button" onClick={() => { setError(""); setStep("email-code"); }} className="text-xs font-medium text-[#A9EC17]/80 transition hover:text-[#A9EC17]">
                Usar o código enviado por e-mail
              </button>
              <button type="button" onClick={returnToLogin} className="flex items-center justify-center gap-1.5 text-xs text-white/45 transition hover:text-white/75">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Voltar para o login
              </button>
            </form>
          )}
        </div>

        <footer className="grid border-t border-white/[0.11] bg-white/[0.012] sm:grid-cols-2">
          <div className="flex items-center justify-center gap-3 px-4 py-4 sm:border-r sm:border-white/[0.11]">
            <ShieldCheck className="h-6 w-6 shrink-0 text-[#A9EC17]" strokeWidth={1.7} />
            <div>
              <p className="text-xs font-semibold text-white">Ambiente seguro</p>
              <p className="mt-0.5 text-[10px] text-white/45">Seus dados estão protegidos</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 border-t border-white/[0.11] px-4 py-4 sm:border-t-0">
            <LockKeyhole className="h-6 w-6 shrink-0 text-white/45" strokeWidth={1.7} />
            <div>
              <p className="text-xs font-semibold text-white">Acesso exclusivo</p>
              <p className="mt-0.5 text-[10px] text-white/45">Somente administradores</p>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
