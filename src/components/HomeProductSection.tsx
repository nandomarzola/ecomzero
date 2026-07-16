import Link from "next/link";
import { ArrowRight, PackageOpen } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import PromoProductCard from "@/components/PromoProductCard";
import type { Product } from "@/types/product";

// Seção reutilizável de produtos da home (Novidades / Promoções / Mais Vendidos)
// e das páginas "Ver todos". Grid responsivo 2 → 3 → 5 colunas. `variant="promo"`
// usa o card de 2 imagens; as demais usam o ProductCard padrão (imagem única).
// Server Component — cada seção busca seus dados fora e passa `products`.
export default function HomeProductSection({
  title,
  products,
  viewAllHref,
  variant = "default",
  emptyLabel = "Nenhum produto por aqui ainda.",
}: {
  title: string;
  products: Product[];
  viewAllHref?: string;
  variant?: "default" | "promo";
  emptyLabel?: string;
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
        <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
        {viewAllHref && products.length > 0 && (
          <Link
            href={viewAllHref}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--brand-color)] transition hover:text-white sm:text-sm"
          >
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0D0D0D] px-6 text-center">
          <PackageOpen className="h-9 w-9 text-[var(--brand-color)]/45" strokeWidth={1.4} />
          <p className="mt-3 text-sm text-white/50">{emptyLabel}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {products.map((product) =>
            variant === "promo" ? (
              <PromoProductCard key={product.id} product={product} />
            ) : (
              <ProductCard key={product.id} product={product} />
            ),
          )}
        </div>
      )}
    </section>
  );
}
