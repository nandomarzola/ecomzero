import { ChartNoAxesColumnIncreasing } from "lucide-react";

export default function TopProductsList() {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-[#111111]">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <h2 className="font-display text-sm font-bold text-white">Produtos mais vendidos</h2>
      </div>
      <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-[#0A0A0A] text-white/25">
          <ChartNoAxesColumnIncreasing className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <p className="mt-4 text-sm font-medium text-white/65">Sem dados de vendas</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/35">
          O ranking será calculado a partir dos pedidos reais.
        </p>
      </div>
    </section>
  );
}
