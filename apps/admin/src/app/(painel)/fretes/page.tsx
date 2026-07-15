import { Box, CheckCircle2, Clock3, ExternalLink, MapPin, TriangleAlert, Truck } from "lucide-react";
import { getShippingIntegrationStatus } from "@/lib/services/shippingAdminService";

export const dynamic = "force-dynamic";

const date = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR") : "Não disponível";

export default async function FretesPage() {
  const integration = await getShippingIntegrationStatus();
  const healthy = integration.configured && !integration.expired;
  return <div className="space-y-5">
    <div><p className="text-sm text-white/50">Integrações e informações operacionais do cálculo de frete.</p><p className="mt-1 text-xs text-white/30">Tokens e segredos nunca são exibidos no painel.</p></div>
    <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><div className="rounded-xl bg-[#A9EC17]/10 p-3 text-[#A9EC17]"><Truck className="h-6 w-6" /></div><div><h2 className="font-display text-lg font-bold">{integration.provider}</h2><p className="mt-1 text-sm text-white/40">Cotação de transportadoras e prazos para a loja.</p></div></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${healthy ? "bg-[#A9EC17]/10 text-[#A9EC17]" : "bg-amber-400/10 text-amber-300"}`}>{healthy ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}{healthy ? "Integração conectada" : integration.expired ? "Credencial expirada" : "Aguardando configuração"}</span></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-white/[0.07] bg-[#090909] p-4"><p className="text-[11px] uppercase text-white/35">Ambiente</p><p className="mt-2 font-semibold text-white">{integration.environment}</p></div>
        <div className="rounded-lg border border-white/[0.07] bg-[#090909] p-4"><p className="flex items-center gap-1 text-[11px] uppercase text-white/35"><MapPin className="h-3 w-3" /> CEP de origem</p><p className="mt-2 font-semibold text-white">{integration.originCep ?? (integration.configured ? "Definido na vitrine" : "Não informado")}</p></div>
        <div className="rounded-lg border border-white/[0.07] bg-[#090909] p-4"><p className="flex items-center gap-1 text-[11px] uppercase text-white/35"><Clock3 className="h-3 w-3" /> Token expira</p><p className="mt-2 text-sm font-semibold text-white">{date(integration.expiresAt)}</p></div>
        <div className="rounded-lg border border-white/[0.07] bg-[#090909] p-4"><p className="text-[11px] uppercase text-white/35">Última atualização</p><p className="mt-2 text-sm font-semibold text-white">{date(integration.updatedAt)}</p></div>
      </div>
      <a href="https://melhorenvio.com.br" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#A9EC17] hover:underline">Abrir Melhor Envio <ExternalLink className="h-3.5 w-3.5" /></a>
    </section>
    <section className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5"><Box className="h-5 w-5 text-[#A9EC17]" /><h2 className="mt-3 font-semibold">Como o cálculo funciona</h2><p className="mt-2 text-sm leading-6 text-white/45">O frete usa peso e dimensões cadastrados no produto. No carrinho, os pesos são somados e a maior dimensão de cada eixo compõe o pacote estimado.</p></div><div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5"><TriangleAlert className="h-5 w-5 text-amber-300" /><h2 className="mt-3 font-semibold">Atenção ao cadastro</h2><p className="mt-2 text-sm leading-6 text-white/45">Medidas incorretas alteram preço e disponibilidade das transportadoras. Sempre informe o pacote já embalado, em centímetros e quilogramas.</p></div></section>
  </div>;
}
