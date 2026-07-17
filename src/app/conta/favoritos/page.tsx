import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFavoriteProducts } from "@/lib/services/productService";
import ProductCard from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "Meus favoritos",
};

export default async function AccountFavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const products = await getFavoriteProducts(session.user.id);

  return (
    <section aria-labelledby="favorites-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-color)]">
            Sua lista
          </p>
          <h2 id="favorites-title" className="font-display mt-1 text-2xl font-extrabold text-white">
            Meus favoritos
          </h2>
        </div>
        {products.length > 0 && (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/45">
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </span>
        )}
      </div>

      {products.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-white/[0.08] bg-[#0D0D0D] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/40">
            <Heart className="h-6 w-6" strokeWidth={1.7} />
          </span>
          <h3 className="font-display mt-4 text-lg font-bold text-white">
            Você ainda não favoritou nenhum produto
          </h3>
          <p className="mt-2 max-w-sm text-sm text-white/50">
            Toque no coração dos produtos que você gostar para salvá-los aqui e
            encontrá-los rapidinho depois.
          </p>
          <Link
            href="/"
            className="store-primary-action font-display mt-6 inline-flex h-11 items-center justify-center px-6 text-[11px] font-bold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Explorar produtos
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} layout="grid" />
          ))}
        </div>
      )}
    </section>
  );
}
