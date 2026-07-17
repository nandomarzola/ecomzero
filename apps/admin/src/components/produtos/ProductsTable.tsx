/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Loader2,
  MoreVertical,
  PackageSearch,
  Pencil,
  Power,
  Search,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import StatusBadge from "@/components/pedidos/StatusBadge";
import { setProductActiveAction } from "@/lib/actions/product";
import type { ProductListItem } from "@/lib/services/productAdminService";

const money = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const inputClass =
  "h-10 rounded-lg border border-white/[0.09] bg-[#111111] px-3 text-[13px] text-white outline-none transition focus:border-[#A9EC17]/40";

export default function ProductsTable({
  products,
  categoryOptions,
  storefrontUrl,
}: {
  products: ProductListItem[];
  categoryOptions: string[];
  storefrontUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  // Busca com debounce (~300ms). Reseta a página dentro do timeout (não no corpo
  // do effect — evita o lint `set-state-in-effect`).
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Atalho ⌘K / Ctrl+K foca a busca.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return products.filter((product) => {
      if (category !== "all" && product.categoria !== category) return false;
      if (status === "ativo" && !product.ativo) return false;
      if (status === "inativo" && product.ativo) return false;
      if (term && !(normalize(product.nome).includes(term) || normalize(product.categoria).includes(term) || normalize(product.slug).includes(term))) {
        return false;
      }
      return true;
    });
  }, [products, search, category, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const first = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = first === 0 ? 0 : first + pageItems.length - 1;

  const activeFilterCount = (category !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);
  const pageIds = pageItems.map((p) => p.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearFilters = () => {
    setCategory("all");
    setStatus("all");
    setPage(1);
  };

  const toggleActive = (product: ProductListItem) => {
    setActionError(null);
    startTransition(async () => {
      const result = await setProductActiveAction(product.id, !product.ativo);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:min-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            ref={searchRef}
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por nome, categoria ou slug…"
            className={`${inputClass} w-full pl-9 pr-14`}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/15 bg-[#0A0A0A] px-1.5 py-0.5 text-[10px] font-medium text-white/40">
            ⌘K
          </kbd>
        </div>

        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={`${inputClass} lg:w-auto`} aria-label="Filtrar por categoria">
          <option value="all">Todas categorias</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${inputClass} lg:w-auto`} aria-label="Filtrar por status">
          <option value="all">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>

        {/* Ações em lote — placeholder (só o estado de seleção está pronto). */}
        <select
          disabled
          value=""
          title={selected.size > 0 ? "Ações em lote — em breve" : "Selecione produtos para ações em lote (em breve)"}
          className={`${inputClass} cursor-not-allowed text-white/40 lg:w-auto`}
          aria-label="Ações em lote"
        >
          <option value="">Todas as ações{selected.size > 0 ? ` (${selected.size})` : ""}</option>
        </select>

        <button
          type="button"
          onClick={clearFilters}
          title={activeFilterCount > 0 ? "Limpar filtros" : "Filtros"}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/[0.09] bg-[#1A1A1A] px-3 text-[13px] font-medium text-white/80 transition hover:border-[#A9EC17]/30"
        >
          <SlidersHorizontal className="h-4 w-4 text-white/55" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#A9EC17] px-1 text-[11px] font-bold text-black">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111111]">
        {pageItems.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-[#0A0A0A] text-white/30">
              <PackageSearch className="h-5 w-5" strokeWidth={1.7} />
            </span>
            <p className="mt-4 text-sm font-medium text-white/70">Nenhum produto encontrado</p>
            <p className="mt-1 text-xs text-white/40">
              {search || activeFilterCount > 0 ? "Ajuste a busca ou os filtros." : "Cadastre o primeiro produto da loja."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.07] text-[11px] font-semibold uppercase tracking-[0.04em] text-white/45">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label="Selecionar todos" className="h-4 w-4 accent-[#A9EC17]" />
                  </th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="hidden px-4 py-3 md:table-cell">Categoria</th>
                  <th className="px-4 py-3">A partir de</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Variantes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {pageItems.map((product) => (
                  <tr key={product.id} className={`transition hover:bg-white/[0.02] ${selected.has(product.id) ? "bg-[#A9EC17]/[0.03]" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleOne(product.id)} aria-label={`Selecionar ${product.nome}`} className="h-4 w-4 accent-[#A9EC17]" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#0a0a0a]">
                          <img src={product.imagem} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-white">{product.nome}</p>
                          <p className="truncate text-[11px] text-white/40">/{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-white/70">
                        <Tag className="h-3.5 w-3.5 shrink-0 text-white/35" />
                        <span className="truncate">{product.categoria.split(" / ").at(-1) ?? product.categoria}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-white/85">{money(product.precoPor)}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/65">
                        {product.tipo === "simples" ? "1 variação" : `${product.variantesCount} variações`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={product.ativo ? "Ativo" : "Inativo"} tone={product.ativo ? "success" : "neutral"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`${storefrontUrl.replace(/\/$/, "")}/produto/${product.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Ver na loja"
                          aria-label={`Ver ${product.nome} na loja`}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-[#1A1A1A] text-white/60 transition hover:border-[#A9EC17]/30 hover:text-[#A9EC17]"
                        >
                          <Eye className="h-4 w-4" strokeWidth={1.8} />
                        </a>
                        <Link
                          href={`/produtos/${product.id}/editar`}
                          title="Editar"
                          aria-label={`Editar ${product.nome}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-[#1A1A1A] text-white/60 transition hover:border-[#A9EC17]/30 hover:text-[#A9EC17]"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.8} />
                        </Link>

                        <details className="group/menu relative">
                          <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-white/[0.08] bg-[#1A1A1A] text-white/60 transition hover:border-white/20 hover:text-white [&::-webkit-details-marker]:hidden">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Mais ações de {product.nome}</span>
                          </summary>
                          <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-white/[0.1] bg-[#151515] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
                            <a
                              href={`${storefrontUrl.replace(/\/$/, "")}/produto/${product.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 px-3 py-2 text-[13px] text-white/75 transition hover:bg-white/[0.05] hover:text-white"
                            >
                              <ExternalLink className="h-4 w-4 text-white/45" /> Ver na loja
                            </a>
                            <Link
                              href={`/produtos/${product.id}/editar`}
                              className="flex items-center gap-2 px-3 py-2 text-[13px] text-white/75 transition hover:bg-white/[0.05] hover:text-white"
                            >
                              <Pencil className="h-4 w-4 text-white/45" /> Editar
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleActive(product)}
                              disabled={pending}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-white/75 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                            >
                              {pending ? <Loader2 className="h-4 w-4 animate-spin text-white/45" /> : <Power className="h-4 w-4 text-white/45" />}
                              {product.ativo ? "Desativar" : "Ativar"}
                            </button>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé / paginação */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row">
          <label className="flex items-center gap-2 text-[12px] text-white/45">
            Mostrar
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-md border border-white/[0.09] bg-[#1A1A1A] px-2 py-1 text-[12px] text-white outline-none"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            por página
          </label>

          <p className="text-[12px] text-white/45">
            Mostrando <span className="text-white/70">{first}</span> a <span className="text-white/70">{last}</span> de{" "}
            <span className="text-white/70">{filtered.length}</span> produtos
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Página anterior"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.09] bg-[#1A1A1A] text-white/70 transition hover:border-[#A9EC17]/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-md border border-[#A9EC17]/40 bg-[#A9EC17]/10 px-2 text-[12px] font-semibold text-[#A9EC17]">
              {currentPage}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Próxima página"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.09] bg-[#1A1A1A] text-white/70 transition hover:border-[#A9EC17]/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <p className="text-[12px] text-white/45">
          {selected.size} produto(s) selecionado(s) — ações em lote em breve.
        </p>
      )}

      {actionError ? (
        <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
