"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";

const passwordRequirements = [
  { label: "Mínimo de 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Ao menos uma letra e um número", test: (value: string) => /[A-Za-zÀ-ÿ]/.test(value) && /\d/.test(value) },
  { label: "Ao menos um caractere especial", test: (value: string) => /[^A-Za-zÀ-ÿ0-9\s]/.test(value) },
];

const noopSubscribe = () => () => {};

const getPasswordResetToken = () =>
  new URLSearchParams(window.location.hash.slice(1)).get("token");

export default function PasswordResetForm() {
  const token = useSyncExternalStore(noopSubscribe, getPasswordResetToken, () => undefined);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Este link não contém um token válido.");
      return;
    }

    if (passwordRequirements.some((requirement) => !requirement.test(password))) {
      setError("A nova senha ainda não atende aos requisitos de segurança.");
      return;
    }

    if (password !== confirmation) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senhaNova: password }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Não foi possível redefinir a senha.");
      }

      setPassword("");
      setConfirmation("");
      window.history.replaceState(null, "", window.location.pathname);
      setSuccess(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível redefinir a senha.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (token === undefined) {
    return (
      <div className="flex min-h-64 items-center justify-center text-white/60">
        <LoaderCircle className="h-6 w-6 animate-spin" aria-label="Carregando" />
      </div>
    );
  }

  if (success) {
    return (
      <section className="mx-auto w-full max-w-[560px] rounded-xl border border-white/[0.12] bg-[linear-gradient(145deg,#101010,#0B0B0B)] p-6 sm:p-9">
        <CheckCircle2 className="h-12 w-12 text-[var(--brand-color)]" />
        <h1 className="font-display mt-5 text-3xl font-extrabold text-white">Senha redefinida</h1>
        <p role="status" className="mt-3 text-sm leading-6 text-white/60">
          Todas as sessões anteriores foram encerradas. Entre novamente usando a nova senha.
        </p>
        <Link href="/login" className="store-primary-action font-display mt-7 flex min-h-12 items-center justify-center px-5 text-xs font-extrabold uppercase">
          Entrar na conta
        </Link>
      </section>
    );
  }

  if (!token) {
    return (
      <section className="mx-auto w-full max-w-[560px] rounded-xl border border-red-400/25 bg-[#0D0D0D] p-6 sm:p-9">
        <LockKeyhole className="h-12 w-12 text-red-300" />
        <h1 className="font-display mt-5 text-3xl font-extrabold text-white">Link inválido</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-white/60">
          Solicite um novo link de recuperação. Por segurança, cada link expira e só pode ser usado uma vez.
        </p>
        <Link href="/recuperar-senha" className="mt-7 inline-flex min-h-11 items-center font-semibold text-[var(--brand-color)] hover:text-white">
          Solicitar outro link
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[560px] rounded-xl border border-white/[0.12] bg-[linear-gradient(145deg,#101010,#0B0B0B)] p-6 sm:p-9">
      <LockKeyhole className="h-12 w-12 text-[var(--brand-color)]" />
      <h1 className="font-display mt-5 text-3xl font-extrabold text-white">Criar nova senha</h1>
      <p className="mt-2 text-sm leading-6 text-white/55">
        Ao concluir, todas as sessões abertas anteriormente serão encerradas.
      </p>

      <form onSubmit={handleSubmit} className="mt-7">
        {[
          { id: "new-password", label: "Nova senha", value: password, setter: setPassword },
          { id: "confirm-password", label: "Confirmar nova senha", value: confirmation, setter: setConfirmation },
        ].map((field) => (
          <label key={field.id} htmlFor={field.id} className="mt-5 block text-[13px] font-semibold text-white first:mt-0">
            {field.label}
            <div className="relative mt-2">
              <input
                id={field.id}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                maxLength={72}
                value={field.value}
                onChange={(event) => {
                  field.setter(event.target.value);
                  setError("");
                }}
                className="h-12 w-full rounded-md border border-white/[0.16] bg-[#080808] px-4 pr-12 text-base text-white outline-none transition focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senhas" : "Mostrar senhas"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/50 hover:text-[var(--brand-color)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
        ))}

        <ul className="mt-5 grid gap-2 text-xs text-white/55">
          {passwordRequirements.map((requirement) => (
            <li key={requirement.label} className={requirement.test(password) ? "text-[#D5FF7B]" : undefined}>
              {requirement.test(password) ? "✓" : "○"} {requirement.label}
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="mt-5 rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="store-primary-action font-display mt-6 flex min-h-12 w-full items-center justify-center gap-2 px-5 text-xs font-extrabold uppercase disabled:cursor-wait disabled:opacity-70"
        >
          {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Redefinindo" : "Redefinir senha"}
        </button>
      </form>
    </section>
  );
}
