import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleX, Layers3, PackageCheck, PackageX, RadioTower } from "lucide-react";
import MetaCatalogActions from "@/components/integracoes/MetaCatalogActions";
import MetaCatalogSettingsForm from "@/components/integracoes/MetaCatalogSettingsForm";
import MetaCatalogTable from "@/components/integracoes/MetaCatalogTable";
import OrderSummaryCard, { type SummaryTone } from "@/components/pedidos/OrderSummaryCard";
import {
  fetchMetaCatalogReport,
  getMetaCatalogFeedUrl,
  getMetaCatalogSettings,
} from "@/lib/services/metaCatalogAdminService";

export const dynamic = "force-dynamic";

const formatDate = (value: string | null) => value
  ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
  : "Ainda não realizada";

export default async function MetaCatalogPage() {
  const [settings, reportResult] = await Promise.all([
    getMetaCatalogSettings(),
    fetchMetaCatalogReport(),
  ]);
  const report = reportResult.ok ? reportResult.report : null;
  const reportError = reportResult.ok ? null : reportResult.error;
  const feedUrl = report?.feedUrl ?? getMetaCatalogFeedUrl();
  const status = !settings.feedActive
    ? { label: "Feed inativo", description: "A Meta recebe indisponibilidade temporária até o feed ser reativado.", tone: "attention" as const }
    : !report
      ? { label: "Erro de comunicação", description: reportError ?? "Não foi possível consultar o storefront.", tone: "error" as const }
      : !report.xmlValid
        ? { label: "XML inválido", description: "A geração foi bloqueada para impedir que a Meta receba um documento quebrado.", tone: "error" as const }
      : report.metrics.totalItems === 0
        ? { label: "Nenhum item elegível", description: "Revise os problemas encontrados antes de conectar o feed.", tone: "error" as const }
        : report.metrics.errors > 0 || report.metrics.warnings > 0
          ? { label: "Feed ativo com atenção", description: `${report.metrics.totalItems} itens elegíveis e ${report.metrics.errors + report.metrics.warnings} apontamentos.`, tone: "attention" as const }
          : { label: "Feed ativo e válido", description: `${report.metrics.totalItems} itens prontos para sincronização.`, tone: "success" as const };
  const statusStyle = status.tone === "success"
    ? "border-[#A9EC17]/25 bg-[#A9EC17]/[0.05] text-[#A9EC17]"
    : status.tone === "attention"
      ? "border-amber-300/20 bg-amber-300/[0.05] text-amber-200"
      : "border-red-300/20 bg-red-300/[0.05] text-red-200";
  const StatusIcon = status.tone === "success" ? CheckCircle2 : status.tone === "attention" ? AlertTriangle : CircleX;
  const metricCards: Array<{ label: string; value: string; subtitle: string; icon: typeof PackageCheck; tone: SummaryTone }> = [
    { label: "Itens enviados", value: String(report?.metrics.totalItems ?? 0), subtitle: "No XML atual", icon: PackageCheck, tone: "green" },
    { label: "Produtos principais", value: String(report?.metrics.mainProducts ?? 0), subtitle: "Grupos elegíveis", icon: RadioTower, tone: "blue" },
    { label: "Variações", value: String(report?.metrics.variations ?? 0), subtitle: "Unidades comerciais", icon: Layers3, tone: "purple" },
    { label: "Itens ignorados", value: String(report?.metrics.ignoredItems ?? 0), subtitle: `${report?.metrics.ignoredProducts ?? 0} produtos afetados`, icon: PackageX, tone: "amber" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#A9EC17]/10 text-[#A9EC17]"><RadioTower className="h-5 w-5" /></span>
          <div><h1 className="font-display text-2xl font-bold text-white">Catálogo da Meta</h1><p className="mt-1 max-w-2xl text-sm text-white/45">Gerencie o feed utilizado para sincronizar os produtos da ECOMZERO com o Facebook e o Instagram.</p></div>
        </div>
        <MetaCatalogActions feedUrl={feedUrl} validationAvailable={reportResult.ok} />
      </header>

      <section className={`rounded-xl border p-5 ${statusStyle}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3"><StatusIcon className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-display text-base font-bold">{status.label}</h2><p className="mt-1 text-xs leading-5 opacity-70">{status.description}</p></div></div>
          <div className="grid gap-1 text-[11px] text-white/45 sm:grid-cols-2 sm:gap-x-8 lg:text-right"><span>Última geração: <strong className="font-medium text-white/70">{formatDate(report?.generatedAt ?? null)}</strong></span><span>Última validação: <strong className="font-medium text-white/70">{formatDate(settings.lastValidatedAt)}</strong></span></div>
        </div>
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-black/25 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-white/35">URL pública do feed</p><code className="mt-1 block break-all text-xs text-white/75">{feedUrl}</code></div><span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">RSS 2.0 · XML</span></div>
      </section>

      <section aria-label="Métricas do catálogo" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metricCards.map((card) => <OrderSummaryCard key={card.label} {...card} />)}
      </section>

      <MetaCatalogSettingsForm initial={settings} stockControlled={report?.stockControlled ?? false} />

      {report ? <MetaCatalogTable items={report.items} /> : (
        <section className="rounded-xl border border-red-300/15 bg-red-300/[0.04] p-6 text-center"><CircleX className="mx-auto h-7 w-7 text-red-300" /><h2 className="mt-3 font-semibold text-white">Pré-visualização indisponível</h2><p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-white/40">{reportError}</p></section>
      )}

      <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-white">Problemas encontrados</h2><p className="mt-1 text-xs text-white/40">Erros impedem o envio; avisos indicam melhorias recomendadas.</p></div>{report ? <div className="flex gap-2 text-[10px]"><span className="rounded-full border border-red-300/20 bg-red-300/[0.06] px-2.5 py-1 text-red-200">{report.metrics.errors} erros</span><span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2.5 py-1 text-amber-200">{report.metrics.warnings} avisos</span></div> : null}</div>
        {!report ? (
          <div className="mt-4 rounded-lg border border-red-300/15 bg-red-300/[0.04] px-4 py-5 text-center text-xs text-red-200">A validação de problemas está indisponível enquanto o storefront não responder.</div>
        ) : report.problems.length === 0 ? (
          <div className="mt-4 rounded-lg border border-[#A9EC17]/15 bg-[#A9EC17]/[0.04] px-4 py-5 text-center text-xs text-[#D9FF87]">Nenhum problema encontrado no catálogo atual.</div>
        ) : (
          <div className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.07]">
            {report.problems.map((problem) => (
              <article key={problem.id} className="grid gap-3 bg-[#090909] p-4 md:grid-cols-[160px_1fr_1fr_auto] md:items-start">
                <div><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold uppercase ${problem.severity === "error" ? "border-red-300/20 bg-red-300/[0.05] text-red-200" : "border-amber-300/20 bg-amber-300/[0.05] text-amber-200"}`}>{problem.field}</span><p className="mt-2 text-xs font-semibold text-white/70">{problem.productName}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wide text-white/30">Motivo</p><p className="mt-1 text-xs leading-5 text-white/55">{problem.reason}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wide text-white/30">Ação recomendada</p><p className="mt-1 text-xs leading-5 text-white/55">{problem.recommendation}</p></div>
                {problem.productId ? <Link href={`/produtos/${problem.productId}/editar`} className="text-xs font-semibold text-[#A9EC17] hover:underline">Editar produto</Link> : <span />}
              </article>
            ))}
          </div>
        )}
      </section>

      <details id="como-conectar-meta" className="group rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between font-display text-base font-bold text-white [&::-webkit-details-marker]:hidden">Como conectar à Meta <span className="text-xl font-normal text-[#A9EC17] transition group-open:rotate-45">+</span></summary>
        <ol className="mt-5 grid gap-2 text-xs leading-5 text-white/55 md:grid-cols-2">
          {["Acesse o Commerce Manager.", "Selecione o catálogo da ECOMZERO.", "Entre em Fontes de dados.", "Adicione uma fonte de dados.", "Selecione feed de dados.", "Escolha atualização agendada.", "Informe a URL pública exibida acima.", "Configure atualização diária.", "Confira os erros após a primeira importação."].map((step, index) => <li key={step} className="flex gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2"><span className="font-bold text-[#A9EC17]">{index + 1}.</span>{step}</li>)}
        </ol>
      </details>
    </div>
  );
}
