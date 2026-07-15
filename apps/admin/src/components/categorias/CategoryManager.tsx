"use client";

import { useState, useTransition } from "react";
import {
  ChevronRight,
  FolderTree,
  GripVertical,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/produtos/ImageUploader";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
  saveCategoryAction,
} from "@/lib/actions/category";
import type { CategoryListItem } from "@/lib/services/categoryAdminService";

type Draft = {
  id: string | null;
  nome: string;
  descricao: string;
  imagemUrl: string;
  destaque: boolean;
  metaTitulo: string;
  metaDescricao: string;
  parentId: string;
  ativo: boolean;
};

const suggestedCategories = [
  "Iluminação",
  "Segurança",
  "Ferramentas",
  "Beleza",
  "Utilidades",
  "Limpeza",
  "Cozinha",
  "Organização",
  "Eletrônicos",
  "Pet",
];

const blankDraft = (nome = ""): Draft => ({
  id: null,
  nome,
  descricao: "",
  imagemUrl: "",
  destaque: false,
  metaTitulo: "",
  metaDescricao: "",
  parentId: "",
  ativo: true,
});

const inputClass = "rounded-lg border border-white/10 bg-[#090909] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#A9EC17]/50";

function reorderHierarchy(
  categories: CategoryListItem[],
  parentId: string | null,
  orderedIds: string[],
) {
  const childrenByParent = new Map<string | null, CategoryListItem[]>();
  for (const category of categories) {
    const siblings = childrenByParent.get(category.parentId) ?? [];
    siblings.push(category);
    childrenByParent.set(category.parentId, siblings);
  }

  const positions = new Map(orderedIds.map((id, index) => [id, index]));
  childrenByParent.get(parentId)?.sort((a, b) => (
    (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  ));

  const result: CategoryListItem[] = [];
  const visited = new Set<string>();
  const visit = (currentParentId: string | null) => {
    for (const category of childrenByParent.get(currentParentId) ?? []) {
      if (visited.has(category.id)) continue;
      visited.add(category.id);
      result.push(category);
      visit(category.id);
    }
  };

  visit(null);
  for (const category of categories) {
    if (visited.has(category.id)) continue;
    visited.add(category.id);
    result.push(category);
    visit(category.id);
  }
  return result;
}

export default function CategoryManager({ categories }: { categories: CategoryListItem[] }) {
  const router = useRouter();
  const [pendingCategories, setPendingCategories] = useState<CategoryListItem[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const displayCategories = pendingCategories ?? categories;

  const unavailableParents = (() => {
    if (!draft?.id) return new Set<string>();
    const blocked = new Set([draft.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of displayCategories) {
        if (category.parentId && blocked.has(category.parentId) && !blocked.has(category.id)) {
          blocked.add(category.id);
          changed = true;
        }
      }
    }
    return blocked;
  })();

  function openNewCategory(nome = "") {
    setError(null);
    setShowSuggestions(false);
    setDraft(blankDraft(nome));
  }

  function edit(category: CategoryListItem) {
    setError(null);
    setShowSuggestions(false);
    setDraft({
      id: category.id,
      nome: category.nome,
      descricao: category.descricao ?? "",
      imagemUrl: category.imagemUrl ?? "",
      destaque: category.destaque,
      metaTitulo: category.metaTitulo ?? "",
      metaDescricao: category.metaDescricao ?? "",
      parentId: category.parentId ?? "",
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

  function reorder(draggedCategoryId: string, targetCategoryId: string) {
    if (draggedCategoryId === targetCategoryId) return;
    const dragged = displayCategories.find((category) => category.id === draggedCategoryId);
    const target = displayCategories.find((category) => category.id === targetCategoryId);
    if (!dragged || !target) return;
    if (dragged.parentId !== target.parentId) {
      setError("Arraste somente entre categorias do mesmo nível e da mesma categoria pai.");
      return;
    }

    const siblingIds = displayCategories
      .filter((category) => category.parentId === dragged.parentId)
      .map((category) => category.id);
    const fromIndex = siblingIds.indexOf(dragged.id);
    const targetIndex = siblingIds.indexOf(target.id);
    const nextIds = siblingIds.filter((id) => id !== dragged.id);
    nextIds.splice(targetIndex, 0, dragged.id);

    if (fromIndex === targetIndex) return;
    setError(null);
    setPendingCategories(reorderHierarchy(displayCategories, dragged.parentId, nextIds));
    startTransition(async () => {
      const result = await reorderCategoriesAction({
        parentId: dragged.parentId ?? "",
        orderedIds: nextIds,
      });
      if (!result.ok) {
        setPendingCategories(null);
        setError(result.error);
        return;
      }
      router.refresh();
      setPendingCategories(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/50">{displayCategories.length} categoria(s) em uma hierarquia sem limite de níveis.</p>
          {displayCategories.length > 1 ? <p className="mt-1 text-xs text-white/30">Arraste pelo ícone à esquerda para reorganizar categorias do mesmo nível.</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSuggestions((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white/65 transition hover:border-[#A9EC17]/30 hover:text-white"
            >
              <Sparkles className="h-4 w-4 text-[#A9EC17]" /> Sugestões rápidas
            </button>
            {showSuggestions ? (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-white/10 bg-[#151515] p-3 shadow-2xl shadow-black/50">
                <p className="mb-2 px-1 text-[11px] uppercase tracking-wide text-white/35">Pré-preencher categoria</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {suggestedCategories.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => openNewCategory(suggestion)}
                      className="rounded-lg bg-white/[0.04] px-3 py-2 text-left text-xs text-white/65 transition hover:bg-[#A9EC17]/10 hover:text-[#A9EC17]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <button type="button" onClick={() => openNewCategory()} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
            <Plus className="h-4 w-4" /> Nova categoria
          </button>
        </div>
      </div>

      {draft ? (
        <form onSubmit={submit} className="rounded-xl border border-[#A9EC17]/20 bg-[#111111] p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-white">{draft.id ? "Editar categoria" : "Nova categoria"}</h2>
              <p className="mt-1 text-xs text-white/40">Crie níveis ilimitados; a posição é definida por arrastar na listagem.</p>
            </div>
            <button type="button" onClick={() => setDraft(null)} aria-label="Fechar formulário" className="rounded-md p-1 text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs text-white/60">Nome
              <input required minLength={2} maxLength={80} value={draft.nome} onChange={(event) => setDraft({ ...draft, nome: event.target.value })} className={inputClass} placeholder="Ex.: Produtos de limpeza" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-white/60">Categoria pai
              <select value={draft.parentId} onChange={(event) => setDraft({ ...draft, parentId: event.target.value })} className={inputClass}>
                <option value="">Categoria raiz</option>
                {displayCategories.filter((category) => !unavailableParents.has(category.id)).map((category) => (
                  <option key={category.id} value={category.id}>{`${"— ".repeat(category.depth)}${category.nome}`}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-white/60 md:col-span-2">Descrição interna
              <textarea maxLength={500} value={draft.descricao} onChange={(event) => setDraft({ ...draft, descricao: event.target.value })} className={`${inputClass} min-h-20 resize-y`} placeholder="Anotações internas opcionais sobre esta categoria" />
            </label>

            <div className="md:col-span-2 grid gap-4 rounded-xl border border-white/[0.07] bg-black/20 p-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <ImageUploader
                label="Imagem ou ícone da categoria"
                value={draft.imagemUrl ? [draft.imagemUrl] : []}
                onChange={(urls) => setDraft({ ...draft, imagemUrl: urls[0] ?? "" })}
                max={1}
                scope="categorias"
              />
              <div className="grid content-start gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.07] bg-[#090909] p-3 text-sm text-white/70">
                  <input type="checkbox" checked={draft.ativo} onChange={(event) => setDraft({ ...draft, ativo: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#A9EC17]" />
                  <span><strong className="block text-sm font-medium text-white">Categoria ativa</strong><span className="mt-0.5 block text-xs text-white/35">Disponível para uso e navegação.</span></span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.07] bg-[#090909] p-3 text-sm text-white/70">
                  <input type="checkbox" checked={draft.destaque} onChange={(event) => setDraft({ ...draft, destaque: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#A9EC17]" />
                  <span><strong className="block text-sm font-medium text-white">Categoria em destaque</strong><span className="mt-0.5 block text-xs text-white/35">Elegível para posições privilegiadas na loja.</span></span>
                </label>
              </div>
            </div>

            <details className="group md:col-span-2 rounded-xl border border-white/[0.07] bg-black/20 open:border-[#A9EC17]/15">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-white/70 marker:hidden">
                <span>SEO da categoria <span className="font-normal text-white/30">(opcional)</span></span>
                <ChevronRight className="h-4 w-4 text-white/35 transition group-open:rotate-90" />
              </summary>
              <div className="grid gap-4 border-t border-white/[0.06] p-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs text-white/60">Meta título
                  <input maxLength={70} value={draft.metaTitulo} onChange={(event) => setDraft({ ...draft, metaTitulo: event.target.value })} className={inputClass} placeholder="Título para buscadores" />
                  <span className="text-right text-[10px] text-white/25">{draft.metaTitulo.length}/70</span>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-white/60">Meta descrição
                  <textarea maxLength={170} value={draft.metaDescricao} onChange={(event) => setDraft({ ...draft, metaDescricao: event.target.value })} className={`${inputClass} min-h-20 resize-y`} placeholder="Resumo exibido nos resultados de busca" />
                  <span className="text-right text-[10px] text-white/25">{draft.metaDescricao.length}/170</span>
                </label>
              </div>
            </details>
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
          <div className="mt-5 flex gap-3">
            <button disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar categoria</button>
            <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white">Cancelar</button>
          </div>
        </form>
      ) : error ? <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

      {displayCategories.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#111111] px-6 text-center">
          <FolderTree className="h-10 w-10 text-white/20" strokeWidth={1.5} />
          <h2 className="font-display mt-4 text-base font-bold text-white">Nenhuma categoria cadastrada</h2>
          <p className="mt-1 max-w-md text-sm text-white/40">Comece pela categoria raiz, como Casa, e depois crie Cozinha, Limpeza e Produtos de limpeza como filhos sucessivos.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111111]">
          <div className="hidden grid-cols-[36px_minmax(0,1fr)_110px_130px_100px] border-b border-white/[0.08] px-4 py-3 text-[11px] uppercase tracking-wide text-white/35 md:grid">
            <span>Ordem</span><span>Hierarquia</span><span>Produtos</span><span>Status</span><span className="text-right">Ações</span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {displayCategories.map((category) => {
              const canReorder = displayCategories.some((candidate) => candidate.id !== category.id && candidate.parentId === category.parentId);
              return (
                <div
                  key={category.id}
                  draggable={canReorder && !isPending}
                  onDragStart={(event) => {
                    setDraggedId(category.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/category-id", category.id);
                  }}
                  onDragOver={(event) => {
                    const dragged = displayCategories.find((candidate) => candidate.id === draggedId);
                    if (!dragged || dragged.parentId !== category.parentId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverId(category.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    reorder(draggedId ?? event.dataTransfer.getData("text/category-id"), category.id);
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                  className={`grid grid-cols-[28px_minmax(0,1fr)] gap-3 px-4 py-3 transition md:grid-cols-[36px_minmax(0,1fr)_110px_130px_100px] md:items-center md:gap-0 ${dragOverId === category.id ? "bg-[#A9EC17]/[0.07]" : ""} ${draggedId === category.id ? "opacity-40" : ""}`}
                >
                  <div className={`flex items-center ${canReorder ? "cursor-grab text-white/30 active:cursor-grabbing" : "text-white/10"}`} title={canReorder ? "Arraste para reordenar" : "Crie outra categoria neste nível para reordenar"}>
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="min-w-0" style={{ paddingLeft: `${category.depth * 22}px` }}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.07] bg-black/30">
                        {category.imagemUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={category.imagemUrl} alt="" className="h-full w-full object-cover" />
                        ) : category.depth > 0 ? <ChevronRight className="h-4 w-4 text-[#A9EC17]/50" /> : <ImageIcon className="h-4 w-4 text-[#A9EC17]/70" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-medium text-white">{category.nome}</p>
                          {category.destaque ? <span title="Categoria em destaque" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#A9EC17]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#A9EC17]"><Star className="h-2.5 w-2.5 fill-current" /> Destaque</span> : null}
                          {category.metaTitulo || category.metaDescricao ? <span className="shrink-0 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300">SEO</span> : null}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-white/30">{category.path}</p>
                      </div>
                    </div>
                  </div>
                  <span className="col-start-2 text-xs text-white/55 md:col-start-auto">{category.productsCount} produto(s)</span>
                  <span className={`col-start-2 w-fit rounded-full px-2 py-1 text-[10px] font-semibold md:col-start-auto ${category.ativo ? "bg-[#A9EC17]/10 text-[#A9EC17]" : "bg-white/5 text-white/35"}`}>{category.ativo ? "Ativa" : "Inativa"}</span>
                  <div className="col-start-2 flex justify-end gap-1 md:col-start-auto">
                    <button type="button" onClick={() => edit(category)} aria-label={`Editar ${category.nome}`} className="rounded-md p-2 text-white/45 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(category)} disabled={isPending} aria-label={`Excluir ${category.nome}`} className="rounded-md p-2 text-red-400/65 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
