import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export const metadata: Metadata = { title: "Entrar" };

// Login single-user do painel. Server Action chama o signIn do NextAuth; em
// caso de credenciais inválidas volta com ?error, senão o signIn redireciona
// pra home (throw de redirect que precisa propagar).
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
    <main className="flex min-h-screen items-center justify-center bg-[#050505] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111111] p-6">
        <h1 className="font-display text-lg font-bold text-white">Admin EcomZero</h1>
        <p className="mt-1 text-xs text-white/45">Acesso restrito ao painel.</p>

        {error ? (
          <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            E-mail ou senha inválidos.
          </p>
        ) : null}

        <form action={login} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-white/60">
            E-mail
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#A9EC17]/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/60">
            Senha
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#A9EC17]/40"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-[#B8E82E] px-3 py-2 text-sm font-semibold text-black transition hover:brightness-95"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
