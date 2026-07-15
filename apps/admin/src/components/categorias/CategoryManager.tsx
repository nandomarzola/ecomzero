"use client";

import { useState, useTransition } from "react";
import { ChevronRight, FolderTree, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/category";
import type { CategoryListItem } from "@/lib/services/categoryAdminService";

type Draft = {
  id: string | null;
  nome: string;
  descricao: string;
  parentId: string;
  ordem: string;
  ativo: boolean;
};

const blankDraft = (): Draft => ({ id: null, nome: "", descricao: "", parentId: "", ordem: "0", ativo: true });
const inputClass = "rounded-lg border border-white/10 bg-[#090909] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#A9EC17]/50";

export default function CategoryManager({ categories }: { categories: CategoryListItem[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unavailableParents = (() => {
    if (!draft?.id) return new Set<string>();
    const blocked = new Set([draft.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of categories) {
        if (category.parentId && blocked.has(category.parentId) && !blocked.has(category.id)) {
          blocked.add(category.id);
          changed = true;
        }
      }
    }
    return blocked;
  })();

  function edit(category: CategoryListItem) {
    setError(null);
    setDraft({
      id: category.id,
      nome: category.nome,
      descricao: category.descricao ?? "",
      parentId: category.parentId ?? "",
      ordem: String(category.ordem),
      ativo: category.ativo,
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = await saveCategoryAction(draft.id, draft);
      if (!result.ok) return setError(result.error);
      setDraft(null);
      router.refresh();
    });
  }

  function remove(category: CategoryListItem) {
    if (!window.confirm(`Excluir a categoria “${category.nome}”?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (!result.ok) return setError(result.error);
      if (draft?.id === category.id) setDraft(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/50">{categories.length} categoria(s) em uma hierarquia sem limite de níveis.</p>
        </div>
        <button type="button" onClick={() => { setError(null); setDraft(blankDraft()); }} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
          <Plus className="h-4 w-4" /> Nova categoria
        </button>
      </div>

      {draft ? (
        <form onSubmit={submit} className="rounded-xl border border-[#A9EC17]/20 bg-[#111111] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-white">{draft.id ? "Editar categoria" : "Nova categoria"}</h2>
              <p className="mt-1 text-xs text-white/40">Escolha uma categoria pai para criar qualquer nível de profundidade.</p>
            </div>
            <button type="button" onClick={() => setDraft(null)} aria-label="Fechar formulário" className="rounded-md p-1 text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs text-white/60">Nome
              <input required value={draft.nome} onChange={(event) => setDraft({ ...draft, nome: event.target.value })} className={inputClass} placeholder="Ex.: Produtos de limpeza" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-white/60">Categoria pai
              <select value={draft.parentId} onChange={(event) => setDraft({ ...draft, parentId: event.target.value })} className={inputClass}>
                <option value="">Categoria raiz</option>
                {categories.filter((category) => !unavailableParents.has(category.id)).map((category) => (
                  <option key={category.id} value={category.id}>{`${"— ".repeat(category.depth)}${category.nome}`}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-white/60 md:col-span-2">Descrição
              <textarea value={draft.descricao} onChange={(event) => setDraft({ ...draft, descricao: event.target.value })} className={`${inputClass} min-h-20 resize-y`} placeholder="Descrição interna opcional" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-white/60">Ordem de exibição
              <input type="number" min="0" value={draft.ordem} onChange={(event) => setDraft({ ...draft, ordem: event.target.value })} className={inputClass} />
            </label>
            <label className="flex items-center gap-2 self-end py-2.5 text-sm text-white/65">
              <input type="checkbox" checked={draft.ativo} onChange={(event) => setDraft({ ...draft, ativo: event.target.checked })} className="h-4 w-4 accent-[#A9EC17]" /> Categoria ativa
            </label>
          </div>
          {error ? <p className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
          <div className="mt-5 flex gap-3">
            <button disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar</button>
            <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white">Cancelar</button>
          </div>
        </form>
      ) : error ? <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

      {categories.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#111111] px-6 text-center">
          <FolderTree className="h-10 w-10 text-white/20" strokeWidth={1.5} />
          <h2 className="font-display mt-4 text-base font-bold text-white">Nenhuma categoria cadastrada</h2>
          <p className="mt-1 max-w-md text-sm text-white/40">Comece pela categoria raiz, como Casa, e depois crie Cozinha, Limpeza e Produtos de limpeza como filhos sucessivos.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111111]">
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_110px_110px] border-b border-white/[0.08] px-4 py-3 text-[11px] uppercase tracking-wide text-white/35 md:grid">
            <span>Hierarquia</span><span>Produtos</span><span>Status</span><span className="text-right">Ações</span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {categories.map((category) => (
              <div key={category.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_110px_110px] md:items-center">
                <div className="min-w-0" style={{ paddingLeft: `${category.depth * 22}px` }}>
                  <div className="flex items-center gap-2">
                    {category.depth > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#A9EC17]/50" /> : <FolderTree className="h-4 w-4 shrink-0 text-[#A9EC17]" />}
                    <p className="truncate text-sm font-medium text-white">{category.nome}</p>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-white/30">{category.path}</p>
                </div>
                <span className="text-xs text-white/55">{category.productsCount} produto(s)</span>
                <span className={`w-fit rounded-full px-2 py-1 text-[10px] font-semibold ${category.ativo ? "bg-[#A9EC17]/10 text-[#A9EC17]" : "bg-white/5 text-white/35"}`}>{category.ativo ? "Ativa" : "Inativa"}</span>
                <div className="flex justify-end gap-1">
                  <button type="button" onClick={() => edit(category)} aria-label={`Editar ${category.nome}`} className="rounded-md p-2 text-white/45 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => remove(category)} disabled={isPending} aria-label={`Excluir ${category.nome}`} className="rounded-md p-2 text-red-400/65 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
