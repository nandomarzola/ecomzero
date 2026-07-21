"use client";

import Link from "next/link";
import { type FormEvent, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

const requirements = [
  { label: "Mínimo de 10 caracteres", test: (value: string) => value.length >= 10 },
  { label: "Uma letra maiúscula", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Uma letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { label: "Um número", test: (value: string) => /\d/.test(value) },
];

const noopSubscribe = () => () => {};
const getToken = () =>
  new URLSearchParams(window.location.hash.slice(1)).get("token");

export default function AdminPasswordResetForm() {
  const token = useSyncExternalStore(noopSubscribe, getToken, () => undefined);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Este link não contém um token válido.");
      return;
    }
    if (requirements.some((requirement) => !requirement.test(password))) {
      setError("A nova senha ainda não atende aos requisitos de segurança.");
      return;
    }
    if (password !== confirmation) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Não foi possível redefinir a senha.");
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
      setLoading(false);
    }
  };

  if (token === undefined) {
    return (
      <main className="admin-login-background flex min-h-dvh items-center justify-center">
        <LoaderCircle className="h-7 w-7 animate-spin text-[#A9EC17]" aria-label="Carregando" />
      </main>
    );
  }

  return (
    <main className="admin-login-background relative flex min-h-dvh items-center justify-center px-4 py-6">
      <section className="admin-login-card relative w-full max-w-[520px] rounded-[20px] border border-white/[0.14] bg-[#101110] p-6 shadow-2xl shadow-black/70 sm:p-9">
        {success ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-[#A9EC17]" />
            <h1 className="font-display mt-5 text-3xl font-bold text-white">Senha redefinida</h1>
            <p role="status" className="mt-3 text-sm leading-6 text-white/60">
              Todas as sessões administrativas anteriores foram revogadas. Entre novamente com a nova senha.
            </p>
            <Link href="/login" className="mt-7 flex min-h-[52px] items-center justify-center rounded-lg bg-[#A9EC17] px-5 text-sm font-extrabold uppercase text-black">
              Entrar no painel
            </Link>
          </>
        ) : !token ? (
          <>
            <LockKeyhole className="h-12 w-12 text-red-300" />
            <h1 className="font-display mt-5 text-3xl font-bold text-white">Link inválido</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-white/60">
              Solicite um novo link. Cada link expira em 30 minutos e só funciona uma vez.
            </p>
            <Link href="/recuperar-senha" className="mt-7 inline-flex min-h-11 items-center text-sm font-semibold text-[#A9EC17]">
              Solicitar outro link
            </Link>
          </>
        ) : (
          <>
            <LockKeyhole className="h-12 w-12 text-[#A9EC17]" />
            <h1 className="font-display mt-5 text-3xl font-bold text-white">Criar nova senha</h1>
            <p className="mt-2 text-sm leading-6 text-white/50">
              A alteração encerrará todas as sessões administrativas abertas.
            </p>
            <form onSubmit={submit} className="mt-6">
              {[
                { id: "admin-new-password", label: "Nova senha", value: password, setter: setPassword },
                { id: "admin-confirm-password", label: "Confirmar nova senha", value: confirmation, setter: setConfirmation },
              ].map((field) => (
                <label key={field.id} htmlFor={field.id} className="mt-5 block text-sm font-semibold text-white first:mt-0">
                  {field.label}
                  <span className="relative mt-2 block">
                    <input
                      id={field.id}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={10}
                      maxLength={72}
                      value={field.value}
                      onChange={(event) => {
                        field.setter(event.target.value);
                        setError("");
                      }}
                      className="h-[52px] w-full rounded-lg border border-white/[0.18] bg-[#080908] px-4 pr-12 text-base text-white outline-none transition focus:border-[#A9EC17]/60 focus:ring-2 focus:ring-[#A9EC17]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Ocultar senhas" : "Mostrar senhas"}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/40 hover:text-white/70"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </span>
                </label>
              ))}

              <ul className="mt-5 grid gap-2 text-xs text-white/50">
                {requirements.map((requirement) => (
                  <li key={requirement.label} className={requirement.test(password) ? "text-[#D5FF7B]" : undefined}>
                    {requirement.test(password) ? "✓" : "○"} {requirement.label}
                  </li>
                ))}
              </ul>
              {error ? (
                <p role="alert" className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#A9EC17] px-5 text-sm font-extrabold uppercase text-black transition hover:bg-[#B8F52B] disabled:cursor-wait disabled:opacity-65"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Redefinindo" : "Redefinir senha"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
