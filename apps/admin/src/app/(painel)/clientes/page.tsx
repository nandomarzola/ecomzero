import { Search } from "lucide-react";
import CustomersTable from "@/components/clientes/CustomersTable";
import { listCustomers } from "@/lib/services/customerAdminService";

export const dynamic = "force-dynamic";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const customers = await listCustomers(q);
  return (
    <div className="space-y-4">
      <div><p className="text-sm text-white/50">{customers.length} cliente(s) cadastrado(s) na loja.</p><p className="mt-1 text-xs text-white/30">Esta base é alimentada automaticamente pelo cadastro do storefront.</p></div>
      <form className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input name="q" type="search" defaultValue={q ?? ""} placeholder="Buscar por nome, e-mail ou telefone" className="w-full rounded-lg border border-white/10 bg-[#111111] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-[#A9EC17]/40" /></div>
        <button className="rounded-lg border border-white/10 px-4 text-sm text-white/65 hover:text-white">Buscar</button>
      </form>
      <CustomersTable customers={customers} />
    </div>
  );
}
