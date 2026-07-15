import Link from "next/link";
import { Pencil } from "lucide-react";
import ActiveToggle from "@/components/produtos/ActiveToggle";
import type { ProductListItem } from "@/lib/services/productAdminService";

const formatPrice = (v: number | null) =>
  v === null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ProductsTable({
  items,
  emptyMessage,
}: {
  items: ProductListItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-white/[0.08] bg-[#111111] px-4 py-8 text-center text-sm text-white/50">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111111]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-white/[0.08] text-[11px] uppercase text-white/40">
          <tr>
            <th className="px-4 py-3 font-medium">Produto</th>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium">A partir de</th>
            <th className="px-4 py-3 font-medium">Variantes</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-b border-white/[0.04] last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-md border border-white/10 bg-[#0a0a0a]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imagem} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{p.nome}</p>
                    <p className="truncate text-[11px] text-white/40">/{p.slug}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-white/70">{p.categoria}</td>
              <td className="px-4 py-3 text-white/70">{formatPrice(p.precoPor)}</td>
              <td className="px-4 py-3 text-white/70">{p.tipo === "simples" ? "Produto simples" : `${p.variantesCount} variações`}</td>
              <td className="px-4 py-3">
                <ActiveToggle id={p.id} ativo={p.ativo} />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/produtos/${p.id}/editar`}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/70 transition hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
