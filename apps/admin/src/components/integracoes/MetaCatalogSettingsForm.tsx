"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { saveMetaCatalogSettingsAction } from "@/lib/actions/metaCatalog";
import type { MetaCatalogAdminSettings } from "@/types/metaCatalog";

type EditableSettings = Omit<MetaCatalogAdminSettings, "lastValidatedAt">;

const inputClass = "h-10 rounded-lg border border-white/[0.09] bg-[#090909] px-3 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-[#A9EC17]/45";

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#A9EC17]" : "bg-white/15"}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-black transition ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

function ToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.07] bg-[#090909] p-3.5">
      <div><p className="text-xs font-semibold text-white/75">{title}</p><p className="mt-1 text-[11px] leading-4 text-white/35">{description}</p></div>
      <Toggle checked={checked} label={title} onChange={onChange} />
    </div>
  );
}

export default function MetaCatalogSettingsForm({ initial, stockControlled }: { initial: MetaCatalogAdminSettings; stockControlled: boolean }) {
  const router = useRouter();
  const [settings, setSettings] = useState<EditableSettings>({
    feedActive: initial.feedActive,
    includeOutOfStock: initial.includeOutOfStock,
    includeSalePrice: initial.includeSalePrice,
    includeAdditionalImages: initial.includeAdditionalImages,
    defaultBrand: initial.defaultBrand,
    defaultCategory: initial.defaultCategory,
  });
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const set = <K extends keyof EditableSettings>(key: K, value: EditableSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    startTransition(async () => {
      const result = await saveMetaCatalogSettingsAction(settings);
      if (!result.ok) {
        setFeedback({ tone: "error", text: result.error });
        return;
      }
      setFeedback({ tone: "success", text: "Configurações do feed salvas." });
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-display text-lg font-bold text-white">Configuração do feed</h2><p className="mt-1 text-xs text-white/40">As alterações são persistidas no banco e usadas na próxima geração do XML.</p></div>
        <button type="button" onClick={save} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#A9EC17] px-4 text-xs font-bold text-black disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar configurações
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <ToggleRow title="Feed ativo" description="Quando desativado, o endpoint responde como temporariamente indisponível e preserva o catálogo atual da Meta." checked={settings.feedActive} onChange={() => set("feedActive", !settings.feedActive)} />
        <ToggleRow title="Incluir produtos sem estoque" description="Mantém itens sem saldo no XML com disponibilidade out of stock." checked={settings.includeOutOfStock} onChange={() => set("includeOutOfStock", !settings.includeOutOfStock)} />
        <ToggleRow title="Incluir preço promocional" description="Envia preço original em g:price e valor atual em g:sale_price quando existir desconto válido." checked={settings.includeSalePrice} onChange={() => set("includeSalePrice", !settings.includeSalePrice)} />
        <ToggleRow title="Incluir imagens adicionais" description="Envia até dez imagens secundárias públicas por item." checked={settings.includeAdditionalImages} onChange={() => set("includeAdditionalImages", !settings.includeAdditionalImages)} />
      </div>

      {!stockControlled ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-300/15 bg-amber-300/[0.05] px-3.5 py-3 text-[11px] leading-5 text-amber-100/65">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> O catálogo atual não possui campo de estoque. Até que esse controle exista, todas as variantes válidas são enviadas como in stock e nenhuma quantidade fictícia é publicada.
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs text-white/55">Marca padrão<input value={settings.defaultBrand} maxLength={80} onChange={(event) => set("defaultBrand", event.target.value)} placeholder="EcomZero" className={inputClass} /><span className="text-[10px] text-white/28">Usada porque o modelo atual não possui marca por produto.</span></label>
        <label className="flex flex-col gap-1.5 text-xs text-white/55">Categoria padrão da Meta<input value={settings.defaultCategory} maxLength={160} onChange={(event) => set("defaultCategory", event.target.value)} placeholder="Ex.: Home & Garden" className={inputClass} /><span className="text-[10px] text-white/28">Enviada em google_product_category; product_type continua usando a categoria real.</span></label>
      </div>
      {feedback ? <p role="status" className={`mt-4 text-xs ${feedback.tone === "success" ? "text-[#A9EC17]" : "text-red-300"}`}>{feedback.text}</p> : null}
    </section>
  );
}
