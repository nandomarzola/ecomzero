import Link from "next/link";
import { CheckCircle2, Layers, Package, Plus, ShoppingBag, Tags } from "lucide-react";
import OrderSummaryCard, { type SummaryTone } from "@/components/pedidos/OrderSummaryCard";
import ProductsTable from "@/components/produtos/ProductsTable";
import { listProducts } from "@/lib/services/productAdminService";
import { listCategories } from "@/lib/services/categoryAdminService";
import { config } from "@/lib/config";

// Sempre dados frescos do banco (é painel de edição, não faz sentido cachear).
export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  // Lista completa (sem filtro) — busca/filtros/paginação são client-side na
  // tabela. Categorias reutilizadas para o dropdown e para o card de resumo.
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);

  const totalVariantes = products.reduce((sum, product) => sum + product.variantesCount, 0);
  const cards: { label: string; value: string; subtitle: string; icon: typeof Package; tone: SummaryTone }[] = [
    { label: "Total de produtos", value: String(products.length), subtitle: "Cadastrados", icon: Package, tone: "green" },
    { label: "Produtos ativos", value: String(products.filter((p) => p.ativo).length), subtitle: "Visíveis na loja", icon: CheckCircle2, tone: "green" },
    { label: "Variantes", value: String(totalVariantes), subtitle: "Somadas de todos os produtos", icon: Layers, tone: "blue" },
    { label: "Categorias", value: String(categories.length), subtitle: "Cadastradas", icon: Tags, tone: "purple" },
  ];

  const categoryOptions = [...new Set(products.map((p) => p.categoria).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return (
    <div className="space-y-5">
      {/* Header da página */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#A9EC17]/10 text-[#A9EC17]">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Produtos</h1>
            <p className="mt-0.5 text-sm text-white/45">Gerencie todos os produtos da sua loja</p>
          </div>
        </div>
        <Link
          href="/produtos/novo"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-105"
        >
          <Plus className="h-4 w-4" /> Novo produto
        </Link>
      </div>

      {/* Cards de resumo */}
      <section aria-label="Resumo de produtos" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <OrderSummaryCard key={card.label} label={card.label} value={card.value} subtitle={card.subtitle} icon={card.icon} tone={card.tone} />
        ))}
      </section>

      <ProductsTable
        products={products}
        categoryOptions={categoryOptions}
        storefrontUrl={config.storefrontUrl ?? "https://www.ecomzero.com.br"}
      />
    </div>
  );
}
