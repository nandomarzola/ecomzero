import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { signIn } from "@/auth";
import PasswordField from "@/components/auth/PasswordField";

export const metadata: Metadata = { title: "Entrar" };

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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";

    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        code: formData.get("code"),
        redirectTo: "/",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login?error=1");
      }
      throw err;
    }
  }

  return (
    <main className="admin-login-background relative flex min-h-dvh items-center justify-center overflow-y-auto px-4 py-4 sm:py-6">
      <section className="admin-login-card relative w-full max-w-[520px] overflow-hidden rounded-[20px] border border-white/[0.14] bg-[#101110] shadow-2xl shadow-black/70">
        <div className="px-5 py-7 sm:px-9 sm:py-8">
          <header className="flex flex-col items-center text-center">
            <BrandMark />
            <h1 className="font-display mt-5 text-[28px] font-bold leading-tight tracking-[-0.035em] text-white sm:text-[30px]">
              Admin EcomZero
            </h1>
            <p className="mt-1.5 text-sm text-white/50">Acesso restrito ao painel.</p>
          </header>

          <div className="my-5 flex items-center gap-4">
            <span className="h-px flex-1 bg-white/[0.11]" />
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#A9EC17]/25 bg-[#A9EC17]/[0.06] text-[#A9EC17]">
              <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
            <span className="h-px flex-1 bg-white/[0.11]" />
          </div>

          {error ? (
            <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
              Credenciais ou código de autenticação inválidos.
            </p>
          ) : null}

          <form action={login} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-semibold text-white">
              E-mail
              <span className="relative block">
                <UserRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A9EC17]"
                  strokeWidth={1.8}
                />
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="Digite seu e-mail"
                  className="h-[52px] w-full rounded-lg border border-white/[0.18] bg-[#080908] pl-12 pr-4 text-sm font-normal text-white outline-none transition placeholder:text-white/38 focus:border-[#A9EC17]/60 focus:ring-2 focus:ring-[#A9EC17]/10"
                />
              </span>
            </label>

            <PasswordField />

            <label className="flex flex-col gap-2 text-sm font-semibold text-white">
              Código 2FA ou de recuperação
              <span className="relative block">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A9EC17]"
                  strokeWidth={1.8}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  name="code"
                  autoComplete="one-time-code"
                  placeholder="Opcional até o 2FA ser ativado"
                  className="h-[52px] w-full rounded-lg border border-white/[0.18] bg-[#080908] pl-12 pr-4 text-sm font-normal uppercase tracking-[0.16em] text-white outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-white/38 focus:border-[#A9EC17]/60 focus:ring-2 focus:ring-[#A9EC17]/10"
                />
              </span>
            </label>

            <div className="flex justify-end">
              <span
                aria-disabled="true"
                title="Recuperação de senha disponível em breve"
                className="cursor-default text-xs font-medium text-[#A9EC17]/75"
              >
                Esqueci minha senha
              </span>
            </div>

            <button
              type="submit"
              className="mt-0.5 h-[52px] rounded-lg bg-[#A9EC17] px-5 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_10px_35px_rgba(169,236,23,0.13)] transition hover:bg-[#B8F52B] focus:outline-none focus:ring-2 focus:ring-[#A9EC17]/60 focus:ring-offset-2 focus:ring-offset-[#101110]"
            >
              Entrar
            </button>
          </form>
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
