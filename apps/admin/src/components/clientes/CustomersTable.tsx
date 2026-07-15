import { Mail, Phone, UserRound } from "lucide-react";
import type { CustomerListItem } from "@/lib/services/customerAdminService";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export default function CustomersTable({ customers }: { customers: CustomerListItem[] }) {
  if (customers.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#111111] px-6 text-center">
        <UserRound className="h-10 w-10 text-white/20" strokeWidth={1.5} />
        <h2 className="font-display mt-4 text-base font-bold text-white">Nenhum cliente encontrado</h2>
        <p className="mt-1 text-sm text-white/40">Os clientes aparecem aqui automaticamente quando se cadastram na loja.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111111]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-white/[0.08] text-[11px] uppercase text-white/40">
          <tr><th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Contato</th><th className="px-4 py-3 font-medium">Marketing</th><th className="px-4 py-3 font-medium">Cadastro</th></tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-b border-white/[0.05] last:border-0">
              <td className="px-4 py-3"><p className="font-medium text-white">{customer.nome ?? "Nome não informado"}</p><p className="mt-0.5 text-[11px] text-white/30">ID {customer.id.slice(0, 8)}</p></td>
              <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-white/70"><Mail className="h-3.5 w-3.5 text-[#A9EC17]" />{customer.email}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-white/45"><Phone className="h-3.5 w-3.5" />{customer.telefone ?? "Não informado"}</span></td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${customer.aceitaMarketing ? "bg-[#A9EC17]/10 text-[#A9EC17]" : "bg-white/5 text-white/35"}`}>{customer.aceitaMarketing ? "Aceitou" : "Não aceitou"}</span></td>
              <td className="px-4 py-3 text-white/55">{dateFormatter.format(customer.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
