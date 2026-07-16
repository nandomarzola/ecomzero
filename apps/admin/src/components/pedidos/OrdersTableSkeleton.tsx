import { ORDERS_PAGE_SIZE } from "@/lib/orders/filters";

const HEAD_CLASS =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-white/45";

// Skeleton exibido enquanto a tabela recarrega (troca de aba, período, busca ou
// página) — via <Suspense> keyed por query na página.
export default function OrdersTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px] border-collapse">
        <thead>
          <tr className="border-b border-white/[0.07]">
            <th className={HEAD_CLASS}>Pedido</th>
            <th className={HEAD_CLASS}>Cliente</th>
            <th className={HEAD_CLASS}>Data</th>
            <th className={HEAD_CLASS}>Pagamento</th>
            <th className={HEAD_CLASS}>Modalidade de frete</th>
            <th className={HEAD_CLASS}>Situação da etiqueta</th>
            <th className={`${HEAD_CLASS} text-right`}>Valor</th>
            <th className={HEAD_CLASS}>Status logístico</th>
            <th className={`${HEAD_CLASS} text-right`}>Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {Array.from({ length: ORDERS_PAGE_SIZE }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-3"><Bar w="w-16" /></td>
              <td className="px-4 py-3"><Bar w="w-28" /><Bar w="w-36" className="mt-1.5 h-2" /></td>
              <td className="px-4 py-3"><Bar w="w-20" /><Bar w="w-14" className="mt-1.5 h-2" /></td>
              <td className="px-4 py-3"><Bar w="w-20" /></td>
              <td className="px-4 py-3"><Bar w="w-28" /></td>
              <td className="px-4 py-3"><Bar w="w-28" className="h-6 rounded-full" /></td>
              <td className="px-4 py-3"><Bar w="w-16" className="ml-auto" /></td>
              <td className="px-4 py-3"><Bar w="w-28" className="h-6 rounded-full" /></td>
              <td className="px-4 py-3"><Bar w="w-8" className="ml-auto h-8 rounded-md" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bar({ w, className = "" }: { w: string; className?: string }) {
  return <span className={`block h-3 animate-pulse rounded bg-white/[0.07] ${w} ${className}`} />;
}
