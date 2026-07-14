import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { signIn } from "@/auth";
import PasswordField from "@/components/auth/PasswordField";

export const metadata: Metadata = { title: "Entrar" };

function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-2 text-[#A9EC17]">
      <svg
        aria-hidden="true"
        viewBox="0 0 88 58"
        className="h-12 w-[76px] sm:h-14 sm:w-[88px]"
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
      <span className="font-display text-2xl font-extrabold tracking-[-0.06em] sm:text-[32px]">
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
    <main className="admin-login-background relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <section className="admin-login-card relative w-full max-w-[780px] overflow-hidden rounded-[24px] border border-white/[0.14] bg-[#101110] shadow-2xl shadow-black/70">
        <div className="px-6 py-10 sm:px-14 sm:py-14">
          <header className="flex flex-col items-center text-center">
            <BrandMark />
            <h1 className="font-display mt-7 text-3xl font-bold tracking-[-0.035em] text-white sm:text-[42px] sm:leading-tight">
              Admin EcomZero
            </h1>
            <p className="mt-3 text-base text-white/50 sm:text-lg">Acesso restrito ao painel.</p>
          </header>

          <div className="my-8 flex items-center gap-5 sm:my-10">
            <span className="h-px flex-1 bg-white/[0.11]" />
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#A9EC17]/25 bg-[#A9EC17]/[0.06] text-[#A9EC17]">
              <ShieldCheck className="h-6 w-6" strokeWidth={1.9} />
            </span>
            <span className="h-px flex-1 bg-white/[0.11]" />
          </div>

          {error ? (
            <p role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              E-mail ou senha inválidos.
            </p>
          ) : null}

          <form action={login} className="flex flex-col gap-6">
            <label className="flex flex-col gap-3 text-sm font-semibold text-white sm:text-base">
              E-mail
              <span className="relative block">
                <UserRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[#A9EC17]"
                  strokeWidth={1.8}
                />
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="Digite seu e-mail"
                  className="h-16 w-full rounded-xl border border-white/[0.18] bg-[#080908] pl-16 pr-5 text-base font-normal text-white outline-none transition placeholder:text-white/38 focus:border-[#A9EC17]/60 focus:ring-2 focus:ring-[#A9EC17]/10 sm:h-[76px] sm:text-lg"
                />
              </span>
            </label>

            <PasswordField />

            <div className="flex justify-end">
              <span
                aria-disabled="true"
                title="Recuperação de senha disponível em breve"
                className="cursor-default text-sm font-medium text-[#A9EC17]/75 sm:text-base"
              >
                Esqueci minha senha
              </span>
            </div>

            <button
              type="submit"
              className="mt-1 h-16 rounded-xl bg-[#A9EC17] px-5 text-base font-extrabold uppercase tracking-wide text-black shadow-[0_10px_35px_rgba(169,236,23,0.13)] transition hover:bg-[#B8F52B] focus:outline-none focus:ring-2 focus:ring-[#A9EC17]/60 focus:ring-offset-2 focus:ring-offset-[#101110]"
            >
              Entrar
            </button>
          </form>
        </div>

        <footer className="grid border-t border-white/[0.11] bg-white/[0.012] sm:grid-cols-2">
          <div className="flex items-center justify-center gap-4 px-6 py-6 sm:border-r sm:border-white/[0.11]">
            <ShieldCheck className="h-8 w-8 shrink-0 text-[#A9EC17]" strokeWidth={1.7} />
            <div>
              <p className="text-sm font-semibold text-white sm:text-base">Ambiente seguro</p>
              <p className="mt-0.5 text-xs text-white/45 sm:text-sm">Seus dados estão protegidos</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 border-t border-white/[0.11] px-6 py-6 sm:border-t-0">
            <LockKeyhole className="h-8 w-8 shrink-0 text-white/45" strokeWidth={1.7} />
            <div>
              <p className="text-sm font-semibold text-white sm:text-base">Acesso exclusivo</p>
              <p className="mt-0.5 text-xs text-white/45 sm:text-sm">Somente administradores</p>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
