"use client";

import { Plus, Trash2 } from "lucide-react";

// Linha de variante no formulário. Campos numéricos ficam como string (inputs
// controlados) — o Zod da action faz o coerce pra número.
export type VariantFormRow = {
  id?: string;
  label: string;
  precoDe: string;
  precoPor: string;
  skuInterno: string;
  linkShopee: string;
  pesoKg: string;
  comprimentoCm: string;
  larguraCm: string;
  alturaCm: string;
};

export function emptyVariant(): VariantFormRow {
  return {
    label: "",
    precoDe: "",
    precoPor: "",
    skuInterno: "",
    linkShopee: "",
    pesoKg: "0.3",
    comprimentoCm: "11",
    larguraCm: "16",
    alturaCm: "4",
  };
}

type Props = {
  value: VariantFormRow[];
  onChange: (rows: VariantFormRow[]) => void;
};

const inputClass =
  "rounded-md border border-white/10 bg-[#0a0a0a] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#A9EC17]/40";

export default function VariantListEditor({ value, onChange }: Props) {
  function update(index: number, patch: Partial<VariantFormRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {value.map((row, index) => (
        <div
          key={row.id ?? `new-${index}`}
          className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70">Variante {index + 1}</span>
            {value.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(index)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="col-span-2 flex flex-col gap-1 text-[11px] text-white/50 sm:col-span-1">
              Rótulo
              <input
                className={inputClass}
                value={row.label}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="1 unidade"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Preço de
              <input
                className={inputClass}
                inputMode="decimal"
                value={row.precoDe}
                onChange={(e) => update(index, { precoDe: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Preço por
              <input
                className={inputClass}
                inputMode="decimal"
                value={row.precoPor}
                onChange={(e) => update(index, { precoPor: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              SKU interno
              <input
                className={inputClass}
                value={row.skuInterno}
                onChange={(e) => update(index, { skuInterno: e.target.value })}
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-[11px] text-white/50 sm:col-span-1">
              Link Shopee
              <input
                className={inputClass}
                value={row.linkShopee}
                onChange={(e) => update(index, { linkShopee: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Peso (kg)
              <input
                className={inputClass}
                inputMode="decimal"
                value={row.pesoKg}
                onChange={(e) => update(index, { pesoKg: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Compr. (cm)
              <input
                className={inputClass}
                inputMode="decimal"
                value={row.comprimentoCm}
                onChange={(e) => update(index, { comprimentoCm: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Largura (cm)
              <input
                className={inputClass}
                inputMode="decimal"
                value={row.larguraCm}
                onChange={(e) => update(index, { larguraCm: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Altura (cm)
              <input
                className={inputClass}
                inputMode="decimal"
                value={row.alturaCm}
                onChange={(e) => update(index, { alturaCm: e.target.value })}
              />
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, emptyVariant()])}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 py-2 text-sm text-white/60 transition hover:border-[#A9EC17]/40 hover:text-white"
      >
        <Plus className="h-4 w-4" /> Adicionar variante
      </button>
    </div>
  );
}
