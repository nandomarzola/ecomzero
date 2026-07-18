import type { Metadata } from "next";
import Link from "next/link";
import CategoryStrip from "@/components/CategoryStrip";
import PasswordResetForm from "@/components/PasswordResetForm";
import { getActiveCategories } from "@/lib/services/storeContentService";

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: "Crie uma nova senha para sua conta EcomZero.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function PasswordResetPage() {
  const categories = await getActiveCategories();

  return (
    <div className="min-h-[70vh] bg-[#050505]">
      <CategoryStrip categories={categories} />
      <main className="mx-auto max-w-[1320px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <nav aria-label="Navegação estrutural" className="mb-7 flex items-center gap-2 text-xs text-white/45">
          <Link href="/" className="hover:text-[var(--brand-color)]">Início</Link>
          <span aria-hidden="true">›</span>
          <span className="text-white/70">Redefinir senha</span>
        </nav>
        <PasswordResetForm />
      </main>
    </div>
  );
}
