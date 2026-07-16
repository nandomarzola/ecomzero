"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  Layers,
  Loader2,
  Percent,
  Save,
  Shuffle,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { saveCouponAction, type CouponSaveMode } from "@/lib/actions/coupon";
import type { CouponListItem } from "@/lib/services/couponAdminService";

type Tipo = "percentual" | "valor_fixo" | "frete_gratis";

type FormState = {
  codigo: string;
  descricao: string;
  tipo: Tipo;
  valor: string;
  descontoMaximo: string;
  valorMinimoPedido: string;
  limiteUsoTotal: string;
  limiteUsoPorCliente: string;
  aplicaEm: "toda_loja" | "categoria" | "produto";
  combinavel: boolean;
  exibirNoSite: boolean;
  primeiraCompra: boolean;
  inicioData: string;
  inicioHora: string;
  fimData: string;
  fimHora: string;
  ativo: boolean;
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0B0B0B] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#A9EC17]/50 placeholder:text-white/25";
const labelClass = "flex flex-col gap-1.5 text-xs font-medium text-white/55";
const hintClass = "text-[11px] text-white/30";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function splitDateTime(iso: string | null): { data: string; hora: string } {
  if (!iso) return { data: "", hora: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { data: "", hora: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function combineDateTime(data: string, hora: string): string {
  if (!data) return "";
  return `${data}T${hora || "00:00"}`;
}

function initialState(coupon: CouponListItem | null): FormState {
  const inicio = splitDateTime(coupon?.inicioEm ?? null);
  const fim = splitDateTime(coupon?.expiraEm ?? null);
  return {
    codigo: coupon?.codigo ?? "",
    descricao: coupon?.descricao ?? "",
    tipo: coupon?.tipo ?? "percentual",
    valor: coupon?.valor != null ? String(coupon.valor) : "",
    descontoMaximo: coupon?.descontoMaximo != null ? String(coupon.descontoMaximo) : "",
    valorMinimoPedido: coupon?.valorMinimoPedido != null ? String(coupon.valorMinimoPedido) : "",
    limiteUsoTotal: coupon?.limiteUsoTotal != null ? String(coupon.limiteUsoTotal) : "",
    limiteUsoPorCliente: coupon?.limiteUsoPorCliente != null ? String(coupon.limiteUsoPorCliente) : "1",
    aplicaEm: coupon?.aplicaEm ?? "toda_loja",
    combinavel: coupon?.combinavel ?? false,
    exibirNoSite: coupon?.exibirNoSite ?? false,
    primeiraCompra: coupon?.primeiraCompra ?? false,
    inicioData: inicio.data,
    inicioHora: inicio.hora,
    fimData: fim.data,
    fimHora: fim.hora,
    ativo: coupon?.ativo ?? true,
  };
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

const brDate = (data: string) => {
  if (!data) return null;
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}`;
};

export default function CouponForm({ coupon }: { coupon: CouponListItem | null }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(coupon));
  const [error, setError] = useState<string | null>(null);
  const [savingMode, setSavingMode] = useState<CouponSaveMode | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function submit(mode: CouponSaveMode) {
    setError(null);
    setSavingMode(mode);
    const payload = {
      codigo: form.codigo,
      descricao: form.descricao,
      tipo: form.tipo,
      valor: form.tipo === "frete_gratis" ? "" : form.valor,
      descontoMaximo: form.tipo === "percentual" ? form.descontoMaximo : "",
      valorMinimoPedido: form.valorMinimoPedido,
      limiteUsoTotal: form.limiteUsoTotal,
      limiteUsoPorCliente: form.limiteUsoPorCliente,
      aplicaEm: form.aplicaEm,
      categoriaId: "",
      produtoId: "",
      combinavel: form.combinavel,
      exibirNoSite: form.exibirNoSite,
      primeiraCompra: form.primeiraCompra,
      inicioEm: combineDateTime(form.inicioData, form.inicioHora),
      expiraEm: combineDateTime(form.fimData, form.fimHora),
      ativo: mode === "draft" ? false : form.ativo,
    };
    startTransition(async () => {
      const result = await saveCouponAction(coupon?.id ?? null, payload, mode);
      setSavingMode(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/cupons");
      router.refresh();
    });
  }

  const summary = useMemo(() => {
    const valorNum = Number(form.valor) || 0;
    const minNum = Number(form.valorMinimoPedido) || 0;
    const discountTitle =
      form.tipo === "percentual"
        ? `${valorNum || 0}% OFF`
        : form.tipo === "valor_fixo"
          ? `${valorNum ? money(valorNum) : "R$ 0,00"} OFF`
          : "FRETE GRÁTIS";
    const condition = minNum > 0 ? `em compras acima de ${money(minNum)}` : "em qualquer compra";
    const periodo =
      brDate(form.inicioData) && brDate(form.fimData)
        ? `${brDate(form.inicioData)} a ${brDate(form.fimData)}`
        : "—";
    return { discountTitle, condition, periodo, valorNum, minNum };
  }, [form]);

  const tipoLabel = { percentual: "Percentual", valor_fixo: "Valor fixo", frete_gratis: "Frete grátis" }[form.tipo];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link href="/cupons" className="inline-flex items-center gap-1 text-xs text-white/40 transition hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <h1 className="font-display mt-2 text-2xl font-bold text-white">{coupon ? "Editar cupom" : "Novo cupom"}</h1>
          <p className="mt-1 text-sm text-white/40">Crie campanhas e aumente suas vendas oferecendo descontos exclusivos.</p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <button
            type="button"
            onClick={() => submit("draft")}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.04] disabled:opacity-60"
          >
            {savingMode === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar rascunho
          </button>
          <button
            type="button"
            onClick={() => submit("publish")}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-60"
          >
            {savingMode === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar cupom
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
        {/* Coluna esquerda — formulário */}
        <div className="space-y-5">
          {/* Seção 1 — Desconto */}
          <section className="rounded-xl border border-white/[0.08] bg-[#101010] p-5">
            <h2 className="font-display text-base font-bold text-white">1. Desconto</h2>
            <p className="mt-1 text-xs text-white/40">Defina o tipo e o valor do desconto.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Código do cupom <span className="text-[#A9EC17]">*</span>
                <div className="flex gap-2">
                  <input
                    value={form.codigo}
                    onChange={(e) => set("codigo", e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    placeholder="BEMVINDO10"
                    className={`${inputClass} font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => set("codigo", randomCode())}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/12 bg-[#1A1A1A] px-3 text-xs font-semibold text-white/75 transition hover:border-[#A9EC17]/30"
                  >
                    <Shuffle className="h-3.5 w-3.5" /> Gerar código
                  </button>
                </div>
              </label>

              <div className={labelClass}>
                Tipo de desconto <span className="text-[#A9EC17]">*</span>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "percentual", label: "Percentual", Icon: Percent },
                    { id: "valor_fixo", label: "Valor fixo", Icon: DollarSign },
                    { id: "frete_gratis", label: "Frete grátis", Icon: Truck },
                  ] as const).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => set("tipo", id)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-semibold transition ${
                        form.tipo === id
                          ? "border-[#A9EC17]/50 bg-[#A9EC17]/10 text-[#A9EC17]"
                          : "border-white/10 bg-[#1A1A1A] text-white/55 hover:text-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {form.tipo !== "frete_gratis" ? (
                <label className={labelClass}>
                  Valor do desconto <span className="text-[#A9EC17]">*</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.valor}
                      onChange={(e) => set("valor", e.target.value)}
                      className={`${inputClass} pr-9`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                      {form.tipo === "percentual" ? "%" : "R$"}
                    </span>
                  </div>
                </label>
              ) : (
                <div className={labelClass}>
                  Valor do desconto
                  <div className={`${inputClass} flex items-center text-white/30`}>Não se aplica a frete grátis</div>
                </div>
              )}

              {form.tipo === "percentual" ? (
                <label className={labelClass}>
                  Desconto máximo (opcional)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.descontoMaximo}
                    onChange={(e) => set("descontoMaximo", e.target.value)}
                    placeholder="R$ 40,00"
                    className={inputClass}
                  />
                  <span className={hintClass}>Limite máximo do desconto por pedido.</span>
                </label>
              ) : (
                <div />
              )}
            </div>
          </section>

          {/* Seção 2 — Regras de uso */}
          <section className="rounded-xl border border-white/[0.08] bg-[#101010] p-5">
            <h2 className="font-display text-base font-bold text-white">2. Regras de uso</h2>
            <p className="mt-1 text-xs text-white/40">Configure as regras e limites de utilização do cupom.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Pedido mínimo (opcional)
                <input type="number" min="0" step="0.01" value={form.valorMinimoPedido} onChange={(e) => set("valorMinimoPedido", e.target.value)} placeholder="R$ 100,00" className={inputClass} />
                <span className={hintClass}>Valor mínimo do carrinho para usar o cupom.</span>
              </label>
              <label className={labelClass}>
                Limite total de usos (opcional)
                <input type="number" min="1" value={form.limiteUsoTotal} onChange={(e) => set("limiteUsoTotal", e.target.value)} placeholder="100" className={inputClass} />
                <span className={hintClass}>Quantidade máxima total que o cupom pode ser usado.</span>
              </label>
              <label className={labelClass}>
                Limite por cliente (opcional)
                <input type="number" min="1" value={form.limiteUsoPorCliente} onChange={(e) => set("limiteUsoPorCliente", e.target.value)} placeholder="1" className={inputClass} />
                <span className={hintClass}>Quantas vezes cada cliente pode usar este cupom.</span>
              </label>
              <label className={labelClass}>
                Aplicar em
                <select value={form.aplicaEm} onChange={(e) => set("aplicaEm", e.target.value as FormState["aplicaEm"])} className={inputClass}>
                  <option value="toda_loja">Toda a loja</option>
                  {/* Categoria/Produto específico: fase 2 — ocultos até haver suporte no carrinho. */}
                </select>
                <span className={hintClass}>Escolha onde o cupom será aplicado.</span>
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <CheckboxCard checked={form.combinavel} onChange={(v) => set("combinavel", v)} label="Permitir combinar com outros cupons" hint="O cupom poderá ser usado junto com outros." />
              <CheckboxCard checked={form.exibirNoSite} onChange={(v) => set("exibirNoSite", v)} label="Exibir cupom no site" hint="Mostrar este cupom na página de cupons." />
              <CheckboxCard checked={form.primeiraCompra} onChange={(v) => set("primeiraCompra", v)} label="Primeira compra" hint="Válido apenas para a primeira compra do cliente." />
            </div>
          </section>

          {/* Seção 3 — Validade */}
          <section className="rounded-xl border border-white/[0.08] bg-[#101010] p-5">
            <h2 className="font-display text-base font-bold text-white">3. Validade</h2>
            <p className="mt-1 text-xs text-white/40">Defina o período de validade do cupom.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className={labelClass}>
                Data de início <span className="text-[#A9EC17]">*</span>
                <div className="flex gap-2">
                  <input type="date" value={form.inicioData} onChange={(e) => set("inicioData", e.target.value)} className={inputClass} />
                  <input type="time" value={form.inicioHora} onChange={(e) => set("inicioHora", e.target.value)} className={`${inputClass} max-w-[120px]`} />
                </div>
              </div>
              <div className={labelClass}>
                Data de término <span className="text-[#A9EC17]">*</span>
                <div className="flex gap-2">
                  <input type="date" value={form.fimData} onChange={(e) => set("fimData", e.target.value)} className={inputClass} />
                  <input type="time" value={form.fimHora} onChange={(e) => set("fimHora", e.target.value)} className={`${inputClass} max-w-[120px]`} />
                </div>
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.ativo}
                onClick={() => set("ativo", !form.ativo)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${form.ativo ? "bg-[#A9EC17]" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition ${form.ativo ? "left-[22px]" : "left-0.5"}`} />
              </button>
              <span>
                <span className="block text-sm font-semibold text-white">Cupom ativo</span>
                <span className="block text-xs text-white/40">Disponível para uso pelos clientes.</span>
              </span>
            </label>
          </section>

          {error ? (
            <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">{error}</p>
          ) : null}
        </div>

        {/* Coluna direita — resumo */}
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-xl border border-white/[0.08] bg-[#101010] p-5">
            <h2 className="font-display text-base font-bold text-white">Resumo do cupom</h2>

            <div className="mt-4 rounded-xl border border-dashed border-[#A9EC17]/40 bg-[radial-gradient(circle_at_80%_10%,rgba(169,236,23,0.08),transparent_55%),#0C0E08] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Código</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${form.ativo ? "bg-[#A9EC17]/15 text-[#A9EC17]" : "bg-white/10 text-white/45"}`}>
                  {form.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="font-display mt-1 text-xl font-bold tracking-wide text-white">{form.codigo || "—"}</p>
              <p className="font-display mt-4 text-3xl font-bold text-[#A9EC17]">{summary.discountTitle}</p>
              <p className="mt-1 text-xs text-white/45">{summary.condition}</p>
            </div>

            <dl className="mt-5 space-y-3 text-[13px]">
              <SummaryRow icon={Percent} label="Tipo de desconto" value={tipoLabel} />
              {form.tipo !== "frete_gratis" ? (
                <SummaryRow icon={DollarSign} label="Valor do desconto" value={form.tipo === "percentual" ? `${summary.valorNum || 0}%` : money(summary.valorNum)} />
              ) : null}
              {form.tipo === "percentual" && form.descontoMaximo ? (
                <SummaryRow icon={BadgePercent} label="Desconto máximo" value={money(Number(form.descontoMaximo) || 0)} />
              ) : null}
              {summary.minNum > 0 ? <SummaryRow icon={CheckCircle2} label="Pedido mínimo" value={money(summary.minNum)} /> : null}
              <SummaryRow icon={Users} label="Limite por cliente" value={`${form.limiteUsoPorCliente || "1"} uso${Number(form.limiteUsoPorCliente) === 1 ? "" : "s"}`} />
              {form.limiteUsoTotal ? <SummaryRow icon={Layers} label="Limite total" value={`${form.limiteUsoTotal} usos`} /> : null}
              <SummaryRow icon={CalendarDays} label="Período de validade" value={summary.periodo} />
              <SummaryRow icon={Store} label="Aplicável em" value="Toda a loja" />
              <SummaryRow icon={Shuffle} label="Combina com outros cupons" value={form.combinavel ? "Sim" : "Não"} />
              {form.primeiraCompra ? <SummaryRow icon={Clock3} label="Primeira compra" value="Sim" /> : null}
            </dl>

            <p className="mt-5 flex gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[11px] leading-5 text-white/40">
              Este é um resumo de como o cupom será exibido para seus clientes.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CheckboxCard({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer gap-2.5 rounded-lg border border-white/10 bg-[#0B0B0B] p-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#A9EC17]" />
      <span>
        <span className="block text-[13px] font-medium text-white/85">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-white/35">{hint}</span>
      </span>
    </label>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Percent;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-white/50">
        <Icon className="h-4 w-4 text-white/35" strokeWidth={1.8} /> {label}
      </dt>
      <dd className="font-medium text-white/85">{value}</dd>
    </div>
  );
}
