import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Tags } from "lucide-react";
import { getActiveCategories } from "@/lib/services/storeContentService";

export const metadata: Metadata = {
  title: "Categorias",
  description: "Navegue pelas categorias da EcomZero.",
};
export const dynamic = "force-dynamic";

export default async function CategoriasIndexPage() {
  const all = await getActiveCategories();
  const roots = all.filter((category) => category.depth === 0);

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-12 lg:px-10">
        <header className="mb-6 sm:mb-8">
          <span className="mb-3 block h-0.5 w-11 bg-[var(--brand-color)]" />
          <h1 className="font-display text-xl font-bold uppercase text-white sm:text-2xl">Categorias</h1>
          <p className="mt-1 text-xs text-white/50">Escolha uma categoria para ver os produtos.</p>
        </header>

        {roots.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0D0D0D] px-6 text-center">
            <Tags className="h-10 w-10 text-[var(--brand-color)]/45" strokeWidth={1.4} />
            <p className="mt-3 text-sm text-white/55">Nenhuma categoria cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {roots.map((root) => {
              const childrenCount = all.filter((c) => c.parentId === root.id).length;
              return (
                <Link
                  key={root.id}
                  href={`/categorias/${root.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5 transition hover:border-[var(--brand-color)]/45"
                >
                  <span className="min-w-0">
                    <span className="font-display block truncate text-base font-bold text-white transition group-hover:text-[var(--brand-color)]">
                      {root.nome}
                    </span>
                    {childrenCount > 0 && (
                      <span className="mt-0.5 block text-[11px] text-white/45">
                        {childrenCount} {childrenCount === 1 ? "subcategoria" : "subcategorias"}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-[var(--brand-color)]" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
