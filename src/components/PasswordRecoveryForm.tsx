"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, LoaderCircle, Mail, ShieldCheck } from "lucide-react";

export default function PasswordRecoveryForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Não foi possível enviar as instruções.");
      }

      setSent(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível enviar as instruções.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[560px] rounded-xl border border-white/[0.12] bg-[linear-gradient(145deg,#101010,#0B0B0B)] p-6 sm:p-9">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)]">
        {sent ? <ShieldCheck className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
      </span>

      <h1 className="font-display mt-5 text-3xl font-extrabold text-white">
        {sent ? "Confira seu e-mail" : "Recuperar senha"}
      </h1>

      {sent ? (
        <div className="mt-4">
          <p role="status" className="text-sm leading-6 text-white/65">
            Se existir uma conta associada a <strong className="text-white">{email}</strong>,
            enviaremos um link válido por 30 minutos e de uso único.
          </p>
          <p className="mt-3 text-xs leading-5 text-white/45">
            Verifique também a caixa de spam. Uma nova solicitação substitui o link anterior.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-6 min-h-11 rounded-md border border-white/20 px-5 text-xs font-bold uppercase text-white transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)]"
          >
            Tentar outro e-mail
          </button>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Informe o e-mail cadastrado para receber um link seguro de redefinição.
          </p>

          <form onSubmit={handleSubmit} className="mt-7">
            <label htmlFor="recovery-email" className="block text-[13px] font-semibold text-white">
              E-mail
            </label>
            <input
              id="recovery-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={160}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              className="mt-2 h-12 w-full rounded-md border border-white/[0.16] bg-[#080808] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)]"
              placeholder="voce@exemplo.com"
            />

            {error && (
              <p role="alert" className="mt-4 rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="store-primary-action font-display mt-6 flex min-h-12 w-full items-center justify-center gap-2 px-5 text-xs font-extrabold uppercase disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Enviando" : "Enviar link seguro"}
            </button>
          </form>
        </>
      )}

      <Link
        href="/login"
        className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--brand-color)] transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para entrar
      </Link>
    </section>
  );
}
