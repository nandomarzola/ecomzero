"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import OAuthButtons from "@/components/OAuthButtons";
import type { OAuthAvailability } from "@/lib/security/oauth";

type FieldName = "email" | "password";

type FieldErrors = Partial<Record<FieldName, string>>;

const inputClassName =
  "h-12 w-full rounded-md border border-white/[0.16] bg-[#080808] px-4 text-sm text-white outline-none transition placeholder:text-white/32 hover:border-white/25 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)] aria-[invalid=true]:border-red-400/80 aria-[invalid=true]:focus:ring-red-400/60";

type LoginFormProps = {
  oauthAvailability: OAuthAvailability;
  returnTo?: "/" | "/checkout" | "/conta/dados";
  initialErrorMessage?: string;
};

export default function LoginForm({
  oauthAvailability,
  returnTo = "/",
  initialErrorMessage = "",
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [statusMessage, setStatusMessage] = useState(initialErrorMessage);
  const [statusIsError, setStatusIsError] = useState(
    Boolean(initialErrorMessage),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearFieldError = (field: FieldName) => {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    setStatusMessage("");
    setStatusIsError(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Informe um e-mail válido.";
    }

    if (!password) {
      nextErrors.password = "Informe sua senha.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage("Revise os campos destacados para continuar.");
      setStatusIsError(true);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");
    setStatusIsError(false);

    try {
      const result = await signIn("credentials", {
        email,
        senha: password,
        redirect: false,
      });

      if (!result.ok) {
        setStatusMessage("E-mail ou senha incorretos.");
        setStatusIsError(true);
        return;
      }

      setStatusMessage("Login realizado com sucesso.");
      router.replace(returnTo);
      router.refresh();
    } catch {
      setStatusMessage("Não foi possível entrar agora. Tente novamente.");
      setStatusIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="login-title"
      className="rounded-xl border border-white/[0.12] bg-[linear-gradient(145deg,#101010,#0B0B0B)] p-6 sm:p-8 lg:px-12 lg:py-10"
    >
      <div className="mx-auto w-full max-w-[520px]">
        <h1
          id="login-title"
          className="font-display text-[30px] font-extrabold leading-tight text-white sm:text-[36px]"
        >
          Entrar
        </h1>
        <p className="mt-1 text-sm text-white/55 sm:text-base">
          Acesse sua conta e continue comprando
        </p>

        <form className="mt-8" noValidate onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-[13px] font-semibold text-white"
            >
              E-mail
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFieldError("email");
              }}
              placeholder="Digite seu e-mail"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              className={inputClassName}
            />
            {errors.email && (
              <p id="login-email-error" className="mt-1.5 text-xs text-red-300">
                {errors.email}
              </p>
            )}
          </div>

          <div className="mt-5">
            <label
              htmlFor="login-password"
              className="mb-2 block text-[13px] font-semibold text-white"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearFieldError("password");
                }}
                placeholder="Digite sua senha"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "login-password-error" : undefined
                }
                className={`${inputClassName} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/55 transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-color)]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id="login-password-error"
                className="mt-1.5 text-xs text-red-300"
              >
                {errors.password}
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-white/60">
              <input
                type="checkbox"
                name="rememberMe"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-white/25 bg-black accent-[var(--brand-color)]"
              />
              <span>Lembrar meus dados</span>
            </label>
            <Link
              href="/recuperar-senha"
              className="shrink-0 rounded-sm text-xs font-semibold text-[var(--brand-color)] transition hover:text-[#B7FF23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
            >
              Esqueci minha senha
            </Link>
          </div>

          {statusMessage && (
            <p
              role="status"
              className={`mt-5 rounded-md border px-4 py-3 text-xs leading-5 ${statusIsError ? "border-red-400/30 bg-red-400/[0.06] text-red-200" : "border-[var(--brand-color)]/30 bg-[var(--brand-color)]/[0.06] text-[#D5FF7B]"}`}
            >
              {statusMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="store-primary-action font-display mt-6 flex min-h-12 w-full items-center justify-center px-5 text-xs font-extrabold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:translate-y-px disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="my-7 flex items-center gap-4 text-xs text-white/45">
          <span className="h-px flex-1 bg-white/[0.12]" />
          <span>ou entre com</span>
          <span className="h-px flex-1 bg-white/[0.12]" />
        </div>

        <OAuthButtons
          availability={oauthAvailability}
          callbackUrl={returnTo}
        />

        <p className="mt-8 text-center text-xs text-white/55 sm:text-sm">
          Ainda não tem uma conta?{" "}
          <Link
            href={
              returnTo === "/checkout"
                ? "/cadastro?retorno=/checkout"
                : "/cadastro"
            }
            className="font-semibold text-[var(--brand-color)] transition hover:text-[#B7FF23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </section>
  );
}
