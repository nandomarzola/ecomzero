import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { listProducts } from "@/lib/services/productAdminService";
import ProductsTable from "@/components/produtos/ProductsTable";

// Sempre dados frescos do banco (é painel de edição, não faz sentido cachear).
export const dynamic = "force-dynamic";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const items = await listProducts(q);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/50">{items.length} produto(s)</p>
        <Link
          href="/produtos/novo"
          className="inline-flex items-center gap-1.5 rounded-md bg-[#B8E82E] px-3 py-2 text-sm font-semibold text-black transition hover:brightness-95"
        >
          <Plus className="h-4 w-4" /> Novo produto
        </Link>
      </div>

      <form method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome, categoria ou slug"
            className="w-full rounded-md border border-white/10 bg-[#111111] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#A9EC17]/40"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:text-white"
        >
          Buscar
        </button>
      </form>

      <ProductsTable
        items={items}
        emptyMessage={q ? "Nenhum produto corresponde à busca." : "Nenhum produto cadastrado."}
      />
    </div>
  );
}
