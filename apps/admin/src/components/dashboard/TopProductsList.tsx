import Link from "next/link";
import { ChartNoAxesColumnIncreasing, ChevronRight } from "lucide-react";

export type TopProduct = {
  id: string;
  name: string;
  quantity: number;
  value: string;
};

export default function TopProductsList({ products }: { products: TopProduct[] }) {
  return (
    <section className="h-full rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] p-4">
      <header className="flex items-center justify-between gap-4">
        <h2 className="font-display text-[15px] font-bold text-white">Produtos mais vendidos</h2>
        <Link href="/produtos" className="rounded-md border border-white/[0.07] bg-[#1A1A1A] px-3 py-2 text-[10px] font-semibold text-white transition hover:border-[#A9EC17]/30">
          Ver todos
        </Link>
      </header>

      {products.length === 0 ? (
        <div className="flex min-h-[224px] flex-col items-center justify-center px-6 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.055] text-white/45">
            <ChartNoAxesColumnIncreasing className="h-6 w-6" strokeWidth={1.7} />
          </span>
          <p className="mt-4 text-[12px] font-semibold text-white">Sem dados de vendas</p>
          <p className="mt-1 max-w-xs text-[10px] leading-relaxed text-white/40">
            O ranking será calculado a partir dos pedidos pagos.
          </p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-white/[0.06]">
          {products.map((product) => (
            <Link key={product.id} href={`/produtos/${product.id}/editar`} className="group flex items-center gap-3 py-3 transition hover:bg-white/[0.02]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#A9EC17]/10 text-[11px] font-bold text-[#A9EC17]">
                {product.quantity}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[11px] font-semibold text-white">{product.name}</strong>
                <span className="mt-0.5 block text-[9px] text-white/40">{product.quantity} vendidos</span>
              </span>
              <strong className="text-[11px] text-white">{product.value}</strong>
              <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-[#A9EC17]" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
