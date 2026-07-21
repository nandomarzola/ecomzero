"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  ArrowLeft,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function AdminPasswordRecoveryForm({
  initialEmail = "",
}: {
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Não foi possível enviar as instruções.");
      }
      setSent(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível enviar as instruções.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-background relative flex min-h-dvh items-center justify-center px-4 py-6">
      <section className="admin-login-card relative w-full max-w-[520px] rounded-[20px] border border-white/[0.14] bg-[#101110] p-6 shadow-2xl shadow-black/70 sm:p-9">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#A9EC17]/10 text-[#A9EC17]">
          {sent ? <ShieldCheck className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
        </span>
        <h1 className="font-display mt-5 text-3xl font-bold text-white">
          {sent ? "Confira seu e-mail" : "Recuperar senha do admin"}
        </h1>

        {sent ? (
          <div className="mt-4">
            <p role="status" className="text-sm leading-6 text-white/65">
              Se existir uma conta administrativa associada a esse e-mail,
              enviaremos um link válido por 30 minutos e de uso único.
            </p>
            <p className="mt-3 text-xs leading-5 text-white/40">
              Verifique também a caixa de spam.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-6 min-h-11 rounded-lg border border-white/15 px-5 text-xs font-bold uppercase text-white/65 transition hover:border-[#A9EC17]/50 hover:text-[#A9EC17]"
            >
              Tentar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6">
            <p className="text-sm leading-6 text-white/50">
              Informe o e-mail cadastrado para receber um link seguro de redefinição.
            </p>
            <label htmlFor="admin-recovery-email" className="mt-5 block text-sm font-semibold text-white">
              E-mail
            </label>
            <input
              id="admin-recovery-email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              maxLength={160}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="admin@ecomzero.com.br"
              className="mt-2 h-[52px] w-full rounded-lg border border-white/[0.18] bg-[#080908] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#A9EC17]/60 focus:ring-2 focus:ring-[#A9EC17]/10"
            />
            {error ? (
              <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#A9EC17] px-5 text-sm font-extrabold uppercase text-black transition hover:bg-[#B8F52B] disabled:cursor-wait disabled:opacity-65"
            >
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Enviando" : "Enviar link seguro"}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#A9EC17]/80 transition hover:text-[#A9EC17]">
          <ArrowLeft className="h-4 w-4" /> Voltar para o login
        </Link>
      </section>
    </main>
  );
}
