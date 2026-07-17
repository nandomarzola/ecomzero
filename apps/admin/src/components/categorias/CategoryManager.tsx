"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  Clock3,
  Copy,
  CornerDownRight,
  Folder,
  FolderTree,
  GripVertical,
  Info,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import ImageUploader from "@/components/produtos/ImageUploader";
import {
  deleteCategoryAction,
  duplicateCategoryAction,
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

const inputClass = "rounded-md border border-white/10 bg-[#090909] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#A9EC17]/50 disabled:cursor-not-allowed disabled:opacity-50";

const blankDraft = (parentId = ""): Draft => ({
  id: null,
  nome: "",
  descricao: "",
  imagemUrl: "",
  destaque: false,
  metaTitulo: "",
  metaDescricao: "",
  parentId,
  ativo: true,
});

function reorderHierarchy(
  categories: CategoryListItem[],
  parentId: string | null,
  orderedIds: string[],
) {
  const positions = new Map(orderedIds.map((id, index) => [id, index]));
  const siblings = categories
    .filter((category) => category.parentId === parentId)
    .sort((a, b) => (positions.get(a.id) ?? a.ordem) - (positions.get(b.id) ?? b.ordem));
  const childrenByParent = new Map<string | null, CategoryListItem[]>();

  for (const category of categories) {
    const group = childrenByParent.get(category.parentId) ?? [];
    group.push(category);
    childrenByParent.set(category.parentId, group);
  }
  childrenByParent.set(parentId, siblings);

  const result: CategoryListItem[] = [];
  const visit = (currentParentId: string | null) => {
    for (const category of childrenByParent.get(currentParentId) ?? []) {
      result.push(category);
      visit(category.id);
    }
  };
  visit(null);
  return result;
}

function deletionBlockReason(category: CategoryListItem) {
  const reasons: string[] = [];
  if (category.productsCount > 0) {
    reasons.push(`${category.productsCount} produto${category.productsCount === 1 ? " vinculado" : "s vinculados"}`);
  }
  if (category.childrenCount > 0) {
    reasons.push(`${category.childrenCount} subcategoria${category.childrenCount === 1 ? "" : "s"}`);
  }
  return reasons.length > 0
    ? `Remova ${reasons.join(" e ")} antes de excluir esta categoria.`
    : null;
}

type CategoryRowProps = {
  category: CategoryListItem;
  canReorder: boolean;
  pending: boolean;
  onEdit: (category: CategoryListItem) => void;
  onNewChild: (category: CategoryListItem) => void;
  onDuplicate: (category: CategoryListItem) => void;
  onDelete: (category: CategoryListItem) => void;
};

function CategoryRow({
  category,
  canReorder,
  pending,
  onEdit,
  onNewChild,
  onDuplicate,
  onDelete,
}: CategoryRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
    disabled: !canReorder || pending,
    data: { parentId: category.parentId },
  });
  const blockedReason = deletionBlockReason(category);
  const isChild = category.depth > 0;
  // Nome do PAI DIRETO (penúltimo segmento do path "A / B / C") — para o label
  // refletir a profundidade real em vez de "Subcategoria" genérico.
  const parentName = isChild ? category.path.split(" / ").at(-2) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative grid min-h-[64px] grid-cols-[32px_minmax(0,1fr)_42px] items-center border-b border-white/[0.055] px-3 transition sm:grid-cols-[42px_minmax(0,1fr)_100px_48px] sm:px-4 ${isDragging ? "z-20 bg-[#14170E] opacity-70 shadow-2xl" : "hover:bg-white/[0.018]"}`}
    >
      <button
        type="button"
        aria-label={`Reordenar ${category.nome}`}
        title={canReorder ? "Arraste para reordenar dentro deste nível" : "É necessário ter outra categoria no mesmo nível; a busca também deve estar vazia"}
        disabled={!canReorder || pending}
        className="flex h-9 w-8 touch-none items-center justify-center rounded text-white/35 transition hover:bg-white/[0.04] hover:text-[#A9EC17] disabled:cursor-not-allowed disabled:text-white/10"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-[17px] w-[17px]" />
      </button>

      <div
        className="flex min-w-0 items-center gap-2 sm:gap-3"
        style={{ paddingLeft: category.depth > 0 ? category.depth * 22 : 0 }}
      >
        {isChild ? (
          <CornerDownRight
            className="h-4 w-4 shrink-0 text-white/25 sm:h-5 sm:w-5"
            strokeWidth={1.4}
            aria-hidden="true"
          />
        ) : null}
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md ${isChild ? "bg-sky-400/10 text-sky-300" : "bg-[#A9EC17]/10 text-[#A9EC17]"}`}>
          {category.imagemUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={category.imagemUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Folder className="h-[18px] w-[18px]" strokeWidth={1.7} />
          )}
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <strong className={`truncate text-[12px] text-white ${isChild ? "font-semibold" : "font-bold"}`}>{category.nome}</strong>
            {category.destaque ? <Star className="h-3.5 w-3.5 shrink-0 fill-[#A9EC17] text-[#A9EC17]" aria-label="Categoria em destaque" /> : null}
          </span>
          <span className="mt-0.5 block truncate text-[10px] text-white/38">
            {category.depth === 0
              ? "Categoria principal"
              : parentName
                ? `Subcategoria de ${parentName}`
                : `Subcategoria (nível ${category.depth + 1})`}
          </span>
        </span>
      </div>

      <span className="hidden text-right text-[11px] font-medium text-white/65 sm:block">{category.productsCount}</span>

      <details className="group/actions relative justify-self-end">
        <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-white/[0.06] text-white/45 transition hover:border-white/15 hover:text-white [&::-webkit-details-marker]:hidden">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Ações de {category.nome}</span>
        </summary>
        <div className="absolute right-0 top-10 z-30 w-[224px] rounded-lg border border-white/[0.1] bg-[#181818] p-1.5 shadow-2xl shadow-black/70">
          <button type="button" onClick={() => onEdit(category)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[11px] text-white/70 transition hover:bg-white/[0.05] hover:text-white">
            <Pencil className="h-4 w-4" /> Editar
          </button>
          {!isChild ? (
            <button type="button" onClick={() => onNewChild(category)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[11px] text-white/70 transition hover:bg-white/[0.05] hover:text-white">
              <Sparkles className="h-4 w-4" /> Nova subcategoria
            </button>
          ) : null}
          <button type="button" onClick={() => onDuplicate(category)} disabled={pending} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[11px] text-white/70 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40">
            <Copy className="h-4 w-4" /> Duplicar
          </button>
          <div className="my-1 border-t border-white/[0.07]" />
          <span className="block" title={blockedReason ?? undefined}>
            <button
              type="button"
              onClick={() => onDelete(category)}
              disabled={Boolean(blockedReason) || pending}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[11px] text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:text-red-300/30"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
              {blockedReason ? <span className="ml-auto text-[8px] uppercase tracking-wide">Bloqueado</span> : null}
            </button>
          </span>
          {blockedReason ? <p className="px-3 pb-2 pt-1 text-[9px] leading-4 text-white/35">{blockedReason}</p> : null}
        </div>
      </details>
    </div>
  );
}

type CategoryDrawerProps = {
  draft: Draft;
  categories: CategoryListItem[];
  pending: boolean;
  error: string | null;
  onChange: (draft: Draft) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

function CategoryDrawer({
  draft,
  categories,
  pending,
  error,
  onChange,
  onClose,
  onSubmit,
}: CategoryDrawerProps) {
  // Sem limite de profundidade: qualquer categoria pode ser pai, exceto a
  // própria e suas descendentes (isso criaria um ciclo). As opções vêm em ordem
  // de árvore (DFS, do service) e são indentadas por nível no <select>.
  const excludedIds = new Set<string>();
  if (draft.id) {
    excludedIds.add(draft.id);
    const childrenByParent = new Map<string | null, string[]>();
    for (const category of categories) {
      const group = childrenByParent.get(category.parentId) ?? [];
      group.push(category.id);
      childrenByParent.set(category.parentId, group);
    }
    const stack = [draft.id];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const childId of childrenByParent.get(current) ?? []) {
        excludedIds.add(childId);
        stack.push(childId);
      }
    }
  }
  const parentOptions = categories.filter((category) => !excludedIds.has(category.id));
  const title = draft.id ? "Editar categoria" : draft.parentId ? "Nova subcategoria" : "Nova categoria";

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Fechar formulário" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      <aside role="dialog" aria-modal="true" aria-labelledby="category-drawer-title" className="absolute inset-y-0 right-0 flex w-full max-w-[680px] flex-col border-l border-white/[0.1] bg-[#101010] shadow-2xl shadow-black/70">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-5 sm:px-6">
          <div>
            <h2 id="category-drawer-title" className="font-display text-base font-bold text-white">{title}</h2>
            <p className="mt-0.5 text-[10px] text-white/40">Escolha a categoria pai em qualquer nível, ou deixe como categoria principal.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-2 text-white/45 transition hover:bg-white/[0.05] hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs text-white/60">
                Nome
                <input required minLength={2} maxLength={80} value={draft.nome} onChange={(event) => onChange({ ...draft, nome: event.target.value })} className={inputClass} placeholder="Ex.: Acessórios para pesca" autoFocus />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-white/60">
                Categoria pai
                <select value={draft.parentId} onChange={(event) => onChange({ ...draft, parentId: event.target.value })} className={inputClass}>
                  <option value="">Categoria principal</option>
                  {parentOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {" ".repeat(category.depth * 3)}{category.depth > 0 ? "└ " : ""}{category.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-xs text-white/60">
              Descrição interna
              <textarea maxLength={500} value={draft.descricao} onChange={(event) => onChange({ ...draft, descricao: event.target.value })} className={`${inputClass} min-h-20 resize-y`} placeholder="Anotações internas opcionais" />
            </label>

            <section className="grid gap-4 rounded-lg border border-white/[0.07] bg-black/20 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <ImageUploader label="Imagem ou ícone" value={draft.imagemUrl ? [draft.imagemUrl] : []} onChange={(urls) => onChange({ ...draft, imagemUrl: urls[0] ?? "" })} max={1} scope="categorias" />
              <div className="grid content-start gap-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-white/[0.07] bg-[#090909] p-3 text-sm text-white/70">
                  <input type="checkbox" checked={draft.ativo} onChange={(event) => onChange({ ...draft, ativo: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#A9EC17]" />
                  <span><strong className="block text-xs font-medium text-white">Categoria ativa</strong><span className="mt-1 block text-[10px] text-white/35">Disponível para uso e navegação.</span></span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-white/[0.07] bg-[#090909] p-3 text-sm text-white/70">
                  <input type="checkbox" checked={draft.destaque} onChange={(event) => onChange({ ...draft, destaque: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#A9EC17]" />
                  <span><strong className="block text-xs font-medium text-white">Categoria em destaque</strong><span className="mt-1 block text-[10px] text-white/35">Elegível para posições privilegiadas.</span></span>
                </label>
              </div>
            </section>

            <details className="group rounded-lg border border-white/[0.07] bg-black/20 open:border-[#A9EC17]/15">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-medium text-white/70 [&::-webkit-details-marker]:hidden">
                <span>SEO da categoria <span className="font-normal text-white/30">(opcional)</span></span>
                <ChevronRight className="h-4 w-4 text-white/35 transition group-open:rotate-90" />
              </summary>
              <div className="grid gap-4 border-t border-white/[0.06] p-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs text-white/60">
                  Meta título
                  <input maxLength={70} value={draft.metaTitulo} onChange={(event) => onChange({ ...draft, metaTitulo: event.target.value })} className={inputClass} placeholder="Título para buscadores" />
                  <span className="text-right text-[10px] text-white/25">{draft.metaTitulo.length}/70</span>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-white/60">
                  Meta descrição
                  <textarea maxLength={170} value={draft.metaDescricao} onChange={(event) => onChange({ ...draft, metaDescricao: event.target.value })} className={`${inputClass} min-h-20 resize-y`} placeholder="Resumo para os resultados de busca" />
                  <span className="text-right text-[10px] text-white/25">{draft.metaDescricao.length}/170</span>
                </label>
              </div>
            </details>

            {error ? <p role="alert" className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p> : null}
          </div>

          <footer className="flex shrink-0 justify-end gap-3 border-t border-white/[0.08] bg-[#101010] p-4 sm:px-6">
            <button type="button" onClick={onClose} className="rounded-md border border-white/10 px-4 py-2.5 text-xs text-white/60 transition hover:text-white">Cancelar</button>
            <button disabled={pending} className="inline-flex items-center gap-2 rounded-md bg-[#A9EC17] px-4 py-2.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-60">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar categoria
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

export default function CategoryManager({ categories }: { categories: CategoryListItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCategories, setPendingCategories] = useState<CategoryListItem[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const displayCategories = pendingCategories ?? categories;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const categoryById = useMemo(
    () => new Map(displayCategories.map((category) => [category.id, category])),
    [displayCategories],
  );

  const visibleCategories = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return displayCategories;
    const visibleIds = new Set<string>();
    for (const category of displayCategories) {
      if (!category.nome.toLocaleLowerCase("pt-BR").includes(normalized)) continue;
      visibleIds.add(category.id);
      if (category.parentId) visibleIds.add(category.parentId);
      if (category.depth === 0) {
        for (const child of displayCategories) {
          if (child.parentId === category.id) visibleIds.add(child.id);
        }
      }
    }
    return displayCategories.filter((category) => visibleIds.has(category.id));
  }, [displayCategories, query]);

  const summary = useMemo(() => {
    const products = categories.reduce((total, category) => total + category.productsCount, 0);
    const deepest = categories.length > 0 ? Math.max(...categories.map((category) => category.depth)) + 1 : 0;
    const latest = categories.reduce<Date | null>((current, category) => {
      const updatedAt = new Date(category.updatedAt);
      return !current || updatedAt > current ? updatedAt : current;
    }, null);
    return {
      products,
      deepest,
      date: latest ? latest.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—",
      time: latest ? latest.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "Sem alterações",
    };
  }, [categories]);

  function openNew(parentId = "") {
    setError(null);
    setDraft(blankDraft(parentId));
  }

  function edit(category: CategoryListItem) {
    setError(null);
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

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = await saveCategoryAction(draft.id, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft(null);
      router.refresh();
    });
  }

  function duplicate(category: CategoryListItem) {
    setError(null);
    startTransition(async () => {
      const result = await duplicateCategoryAction(category.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(category: CategoryListItem) {
    const blockedReason = deletionBlockReason(category);
    if (blockedReason) {
      setError(blockedReason);
      return;
    }
    if (!window.confirm(`Excluir definitivamente a categoria “${category.nome}”?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || query.trim()) return;
    const dragged = categoryById.get(String(active.id));
    const target = categoryById.get(String(over.id));
    if (!dragged || !target || dragged.parentId !== target.parentId) return;

    const siblingIds = displayCategories
      .filter((category) => category.parentId === dragged.parentId)
      .map((category) => category.id);
    const from = siblingIds.indexOf(dragged.id);
    const to = siblingIds.indexOf(target.id);
    if (from < 0 || to < 0) return;
    const orderedIds = arrayMove(siblingIds, from, to);

    setError(null);
    setPendingCategories(reorderHierarchy(displayCategories, dragged.parentId, orderedIds));
    startTransition(async () => {
      const result = await reorderCategoriesAction({
        parentId: dragged.parentId ?? "",
        orderedIds,
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
      <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <p className="text-[11px] text-white/50">Organize suas categorias em uma hierarquia. Arraste para reordenar.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block sm:w-[340px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar categoria..." className="h-10 w-full rounded-md border border-white/[0.09] bg-[#111111] pl-10 pr-3 text-xs text-white outline-none transition placeholder:text-white/30 focus:border-[#A9EC17]/40" />
          </label>
          <button type="button" onClick={() => openNew()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#A9EC17] px-4 text-xs font-semibold text-black transition hover:brightness-110">
            <Plus className="h-4 w-4" /> Nova categoria
          </button>
        </div>
      </section>

      <section aria-label="Resumo das categorias" className="grid overflow-hidden rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-white/[0.06]">
        {[
          { label: "Categorias", value: String(categories.length), subtitle: "Total", icon: FolderTree, iconClass: "bg-[#A9EC17]/10 text-[#A9EC17]" },
          { label: "Produtos vinculados", value: String(summary.products), subtitle: "Total", icon: Box, iconClass: "bg-sky-400/10 text-sky-300" },
          { label: "Nível mais profundo", value: String(summary.deepest), subtitle: "Níveis", icon: ChartNoAxesColumnIncreasing, iconClass: "bg-violet-400/10 text-violet-300" },
          { label: "Última atualização", value: summary.date, subtitle: summary.time, icon: Clock3, iconClass: "bg-amber-400/10 text-amber-300" },
        ].map(({ label, value, subtitle, icon: Icon, iconClass }) => (
          <article key={label} className="flex min-h-[84px] items-center gap-3 border-b border-white/[0.06] p-4 last:border-b-0 sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(4)]:border-b-0 xl:border-b-0">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconClass}`}><Icon className="h-5 w-5" strokeWidth={1.7} /></span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] text-white/45">{label}</span>
              <strong className="font-display mt-0.5 block truncate text-lg font-bold text-white">{value}</strong>
              <span className="block text-[9px] text-white/35">{subtitle}</span>
            </span>
          </article>
        ))}
      </section>

      {error && !draft ? <p role="alert" className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p> : null}

      <section className="overflow-visible rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)]">
        <header className="grid min-h-[46px] grid-cols-[32px_minmax(0,1fr)_42px] items-center border-b border-white/[0.07] px-3 text-[9px] font-bold uppercase tracking-[0.08em] text-white/40 sm:grid-cols-[42px_minmax(0,1fr)_100px_48px] sm:px-4">
          <span />
          <span>Categoria</span>
          <span className="hidden text-right sm:block">Produtos</span>
          <span />
        </header>

        {displayCategories.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <FolderTree className="h-10 w-10 text-white/20" strokeWidth={1.5} />
            <h2 className="font-display mt-4 text-sm font-bold text-white">Nenhuma categoria cadastrada</h2>
            <p className="mt-1 max-w-md text-xs text-white/40">Crie uma categoria principal e organize suas subcategorias abaixo dela.</p>
          </div>
        ) : visibleCategories.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <Search className="h-8 w-8 text-white/20" />
            <p className="mt-3 text-xs font-medium text-white/60">Nenhuma categoria encontrada</p>
            <button type="button" onClick={() => setQuery("")} className="mt-2 text-[10px] text-[#A9EC17]">Limpar busca</button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={(args) => {
              const parentId = args.active.data.current?.parentId ?? null;
              return closestCenter(args).filter((collision) => categoryById.get(String(collision.id))?.parentId === parentId);
            }}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={visibleCategories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
              {visibleCategories.map((category) => {
                const canReorder = !query.trim() && displayCategories.some((candidate) => candidate.id !== category.id && candidate.parentId === category.parentId);
                return (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    canReorder={canReorder}
                    pending={isPending}
                    onEdit={edit}
                    onNewChild={(parent) => openNew(parent.id)}
                    onDuplicate={duplicate}
                    onDelete={remove}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}

        <footer className="m-3 flex items-start gap-2 rounded-md border border-white/[0.07] bg-black/[0.08] px-3 py-3 text-[10px] leading-5 text-white/45">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Dica: Arraste as categorias usando o ícone <GripVertical className="mx-0.5 inline h-3.5 w-3.5" /> para reordenar dentro do mesmo nível.</span>
          {isPending ? <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin text-[#A9EC17]" /> : null}
        </footer>
      </section>

      {draft ? (
        <CategoryDrawer
          draft={draft}
          categories={displayCategories}
          pending={isPending}
          error={error}
          onChange={setDraft}
          onClose={() => { setDraft(null); setError(null); }}
          onSubmit={submit}
        />
      ) : null}
    </div>
  );
}
