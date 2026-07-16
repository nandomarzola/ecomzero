import { Loader2 } from "lucide-react";

export default function CategoriasLoading() {
  return (
    <div className="space-y-4" aria-label="Carregando categorias">
      <div className="flex items-center justify-between gap-4">
        <div className="h-4 w-72 animate-pulse rounded bg-white/[0.06]" />
        <div className="flex gap-2">
          <div className="h-10 w-72 animate-pulse rounded-md bg-white/[0.06]" />
          <div className="h-10 w-36 animate-pulse rounded-md bg-[#A9EC17]/10" />
        </div>
      </div>
      <div className="grid overflow-hidden rounded-[9px] border border-white/[0.08] sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[84px] animate-pulse border-white/[0.06] bg-white/[0.025]" />)}
      </div>
      <div className="flex min-h-[360px] items-center justify-center rounded-[9px] border border-white/[0.08] bg-[#111111] text-xs text-white/40">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#A9EC17]" />
        Carregando árvore de categorias...
      </div>
    </div>
  );
}
