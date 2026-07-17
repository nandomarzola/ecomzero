import type { Metadata } from "next";
import Link from "next/link";
import { PackageOpen, Search, XCircle } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getAllProducts } from "@/lib/services/productService";

export const metadata: Metadata = {
  title: "Busca",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// Filtro por nome sem acento (mesma normalização que o Showcase fazia).
const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  const all = await getAllProducts();
  const results = term
    ? all.filter((product) => normalizeText(product.nome).includes(normalizeText(term)))
    : [];

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-12 lg:px-10">
        {!term ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0D0D0D] px-6 text-center">
            <Search className="h-10 w-10 text-[var(--brand-color)]/45" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-white/55">Digite o que você procura na busca do topo.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
              <div>
                <span className="mb-3 block h-0.5 w-11 bg-[var(--brand-color)]" />
                <h1 className="font-display text-xl font-bold uppercase text-white sm:text-2xl">
                  Resultados para &ldquo;{term}&rdquo;
                </h1>
                <p className="mt-1 text-xs text-white/50">
                  {results.length} {results.length === 1 ? "produto encontrado" : "produtos encontrados"}.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
              >
                <XCircle className="h-4 w-4" />
                Limpar filtro
              </Link>
            </div>

            {results.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0D0D0D] px-6 text-center">
                <PackageOpen className="h-10 w-10 text-[var(--brand-color)]/45" strokeWidth={1.4} />
                <p className="mt-3 text-sm text-white/65">
                  Nenhum produto encontrado para &ldquo;{term}&rdquo;.
                </p>
                <Link href="/" className="mt-2 text-sm text-[var(--brand-color)] hover:underline">
                  Voltar para a loja
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
