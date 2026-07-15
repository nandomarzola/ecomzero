import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccountNavigation from "@/components/AccountNavigation";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-[70vh] bg-[#050505]">
      <div className="mx-auto max-w-[1240px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <nav aria-label="Navegação estrutural" className="flex items-center gap-2 text-xs text-white/40">
          <Link href="/" className="transition hover:text-[#A9EC17]">
            Início
          </Link>
          <span aria-hidden="true">›</span>
          <span className="text-white/65">Minha conta</span>
        </nav>

        <header className="mt-6 border-b border-white/[0.08] pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A9EC17]">
            Área do cliente
          </p>
          <h1 className="font-display mt-2 text-3xl font-extrabold text-white sm:text-4xl">
            Minha conta
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Consulte seus pedidos e mantenha seus dados atualizados.
          </p>
        </header>

        <div className="mt-7 grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start">
          <AccountNavigation />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
