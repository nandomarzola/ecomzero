import type { Metadata } from "next";
import Link from "next/link";
import CategoryStrip from "@/components/CategoryStrip";
import PasswordRecoveryForm from "@/components/PasswordRecoveryForm";
import { getActiveCategories } from "@/lib/services/storeContentService";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Recupere o acesso à sua conta EcomZero.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PasswordRecoveryPageProps = {
  searchParams: Promise<{ email?: string | string[] }>;
};

export default async function PasswordRecoveryPage({ searchParams }: PasswordRecoveryPageProps) {
  const [categories, params] = await Promise.all([getActiveCategories(), searchParams]);
  const initialEmail = typeof params.email === "string" ? params.email.slice(0, 160) : "";

  return (
    <div className="min-h-[70vh] bg-[#050505]">
      <CategoryStrip categories={categories} />
      <main className="mx-auto max-w-[1320px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <nav aria-label="Navegação estrutural" className="mb-7 flex items-center gap-2 text-xs text-white/45">
          <Link href="/" className="hover:text-[var(--brand-color)]">Início</Link>
          <span aria-hidden="true">›</span>
          <Link href="/login" className="hover:text-[var(--brand-color)]">Entrar</Link>
          <span aria-hidden="true">›</span>
          <span className="text-white/70">Recuperar senha</span>
        </nav>
        <PasswordRecoveryForm initialEmail={initialEmail} />
      </main>
    </div>
  );
}
