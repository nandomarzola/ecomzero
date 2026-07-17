"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { saveShippingSettingsAction } from "@/lib/actions/shipping";

type InitialSettings = {
  nomeRemetente: string;
  emailRemetente: string;
  telefoneRemetente: string;
  cpfCnpjRemetente: string;
  inscricaoEstadual: string | null;
  atividadeEconomica: string | null;
  cepOrigem: string;
  logradouroOrigem: string;
  numeroOrigem: string;
  complementoOrigem: string | null;
  bairroOrigem: string;
  cidadeOrigem: string;
  ufOrigem: string;
  documentoFiscalPadrao: "nota_fiscal" | "declaracao_conteudo";
} | null;

const inputClass =
  "rounded-lg border border-white/10 bg-[#090909] px-3 py-2.5 text-sm text-white outline-none focus:border-[#A9EC17]/50";

export default function ShippingSettingsForm({ initial }: { initial: InitialSettings }) {
  const [form, setForm] = useState({
    nomeRemetente: initial?.nomeRemetente ?? "",
    emailRemetente: initial?.emailRemetente ?? "",
    telefoneRemetente: initial?.telefoneRemetente ?? "",
    cpfCnpjRemetente: initial?.cpfCnpjRemetente ?? "",
    inscricaoEstadual: initial?.inscricaoEstadual ?? "",
    atividadeEconomica: initial?.atividadeEconomica ?? "",
    cepOrigem: initial?.cepOrigem ?? "",
    logradouroOrigem: initial?.logradouroOrigem ?? "",
    numeroOrigem: initial?.numeroOrigem ?? "",
    complementoOrigem: initial?.complementoOrigem ?? "",
    bairroOrigem: initial?.bairroOrigem ?? "",
    cidadeOrigem: initial?.cidadeOrigem ?? "",
    ufOrigem: initial?.ufOrigem ?? "",
    documentoFiscalPadrao: initial?.documentoFiscalPadrao ?? "declaracao_conteudo",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveShippingSettingsAction(form);
      if (!result.ok) return setError(result.error);
      setSaved(true);
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A9EC17]">Remetente</p>
        <h2 className="font-display mt-1 text-lg font-bold">Dados de origem da etiqueta</h2>
        <p className="mt-1 text-xs text-white/40">Informe o endereço onde os pacotes serão postados.</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-white/60">Nome ou razão social<input required value={form.nomeRemetente} onChange={(event) => set("nomeRemetente", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">E-mail<input required type="email" value={form.emailRemetente} onChange={(event) => set("emailRemetente", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Telefone<input required value={form.telefoneRemetente} onChange={(event) => set("telefoneRemetente", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">CPF ou CNPJ<input required value={form.cpfCnpjRemetente} onChange={(event) => set("cpfCnpjRemetente", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Inscrição estadual<input value={form.inscricaoEstadual} onChange={(event) => set("inscricaoEstadual", event.target.value)} className={inputClass} placeholder="ISENTO, quando aplicável" /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">CNAE opcional<input value={form.atividadeEconomica} onChange={(event) => set("atividadeEconomica", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">CEP<input required value={form.cepOrigem} onChange={(event) => set("cepOrigem", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60 lg:col-span-2">Logradouro<input required value={form.logradouroOrigem} onChange={(event) => set("logradouroOrigem", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Número<input required value={form.numeroOrigem} onChange={(event) => set("numeroOrigem", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Complemento<input value={form.complementoOrigem} onChange={(event) => set("complementoOrigem", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Bairro<input required value={form.bairroOrigem} onChange={(event) => set("bairroOrigem", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Cidade<input required value={form.cidadeOrigem} onChange={(event) => set("cidadeOrigem", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">UF<input required maxLength={2} value={form.ufOrigem} onChange={(event) => set("ufOrigem", event.target.value.toUpperCase())} className={inputClass} /></label>
      </div>

      <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#090909] p-4">
        <label className="flex max-w-xl flex-col gap-2 text-xs text-white/60">
          Pré-seleção fiscal dos pedidos
          <select
            value={form.documentoFiscalPadrao}
            onChange={(event) => set("documentoFiscalPadrao", event.target.value)}
            className={inputClass}
          >
            <option value="declaracao_conteudo">Declaração de conteúdo</option>
            <option value="nota_fiscal">NF-e</option>
          </select>
        </label>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-white/40">
          Esta opção apenas vem marcada ao abrir um pedido. Nenhum documento é definido automaticamente: é obrigatório confirmar a escolha em cada pedido antes de comprar a etiqueta.
        </p>
      </div>

      {error ? <p className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      {saved ? <p className="mt-4 flex items-center gap-2 rounded-lg border border-[#A9EC17]/20 bg-[#A9EC17]/5 px-3 py-2 text-sm text-[#A9EC17]"><CheckCircle2 className="h-4 w-4" /> Dados do remetente salvos.</p> : null}

      <button disabled={pending} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar remetente
      </button>
    </form>
  );
}
