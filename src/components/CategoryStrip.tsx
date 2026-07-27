"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Grid2X2,
  Heart,
  Lightbulb,
  Menu,
  Package,
  ShieldCheck,
  SprayCan,
  Wrench,
} from "lucide-react";
import type { StoreCategory } from "@/lib/services/storeContentService";

const iconMap = {
  iluminacao: Lightbulb,
  seguranca: ShieldCheck,
  ferramentas: Wrench,
  beleza: Heart,
  utilidades: Package,
  limpeza: SprayCan,
};

function categoryHref(
  category: StoreCategory,
  categoriesById: Map<string, StoreCategory>,
) {
  const slugs = [category.slug];
  const visited = new Set([category.id]);
  let parentId = category.parentId;

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = categoriesById.get(parentId);
    if (!parent) break;
    slugs.unshift(parent.slug);
    parentId = parent.parentId;
  }

  return `/categorias/${slugs.join("/")}`;
}

export default function CategoryStrip({ categories }: { categories: StoreCategory[] }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLElement | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const roots = categories.filter((category) => category.depth === 0);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const directChildren = new Map<string, StoreCategory[]>();

  for (const category of categories) {
    if (!category.parentId) continue;
    directChildren.set(category.parentId, [
      ...(directChildren.get(category.parentId) ?? []),
      category,
    ]);
  }

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const openRoot =
    openMenu && openMenu !== "all"
      ? roots.find((category) => category.id === openMenu) ?? null
      : null;
  const panelRoots = openMenu === "all" ? roots : openRoot ? [openRoot] : [];

  return (
    <section
      ref={containerRef}
      className="relative border-y border-white/[0.08] bg-[#080808]"
    >
      <div className="mx-auto flex h-[58px] max-w-[1440px] items-stretch gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 md:hidden [&::-webkit-scrollbar]:hidden">
        <Link
          href="/categorias"
          className="group relative flex min-w-[176px] shrink-0 items-center gap-2.5 px-3 text-center sm:px-4"
        >
          <Menu className="h-[18px] w-[18px] text-[var(--brand-color)]/85" strokeWidth={1.7} />
          <span className="whitespace-nowrap text-[11px] font-medium text-white/68">
            Todas as categorias
          </span>
        </Link>
        {roots.map((category) => {
          const Icon = iconMap[category.slug as keyof typeof iconMap] ?? Grid2X2;
          const href = categoryHref(category, categoriesById);
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={category.id}
              href={href}
              onClick={() => setOpenMenu(null)}
              aria-current={isActive ? "page" : undefined}
              className="group relative flex shrink-0 items-center gap-2.5 px-3 text-center sm:px-4"
            >
              <Icon
                className={`h-[18px] w-[18px] transition ${
                  isActive
                    ? "text-[var(--brand-color)]"
                    : "text-[var(--brand-color)]/85 group-hover:text-[#B7FF23]"
                }`}
                strokeWidth={1.7}
              />
              <span
                className={`whitespace-nowrap text-[11px] font-medium transition ${
                  isActive
                    ? "text-white"
                    : "text-white/68 group-hover:text-[var(--brand-color)]"
                }`}
              >
                {category.nome}
              </span>
              {isActive && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 bg-[var(--brand-color)]" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>

      <nav
        aria-label="Categorias de produtos"
        className="mx-auto hidden h-[58px] max-w-[1440px] items-stretch gap-1 px-6 md:flex lg:px-8"
      >
        <button
          type="button"
          onClick={() => setOpenMenu((current) => current === "all" ? null : "all")}
          aria-expanded={openMenu === "all"}
          aria-controls="desktop-category-panel"
          className="group relative flex min-w-[176px] shrink-0 items-center gap-2.5 px-4 text-center"
        >
          <Menu className="h-[18px] w-[18px] text-[var(--brand-color)]/85 transition group-hover:text-[#B7FF23]" strokeWidth={1.7} />
          <span className="whitespace-nowrap text-[11px] font-medium text-white/68 transition group-hover:text-[var(--brand-color)]">
            Todas as categorias
          </span>
          <ChevronDown
            className={`ml-auto h-3.5 w-3.5 text-white/40 transition ${
              openMenu === "all" ? "rotate-180 text-[var(--brand-color)]" : ""
            }`}
          />
        </button>

        {roots.map((category) => {
          const Icon = iconMap[category.slug as keyof typeof iconMap] ?? Grid2X2;
          const href = categoryHref(category, categoriesById);
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const hasChildren = (directChildren.get(category.id)?.length ?? 0) > 0;
          const isOpen = openMenu === category.id;
          const content = (
            <>
              <Icon
                className={`h-[18px] w-[18px] transition ${
                  isActive || isOpen
                    ? "text-[var(--brand-color)]"
                    : "text-[var(--brand-color)]/85 group-hover:text-[#B7FF23]"
                }`}
                strokeWidth={1.7}
              />
              <span
                className={`whitespace-nowrap text-[11px] font-medium transition ${
                  isActive || isOpen
                    ? "text-white"
                    : "text-white/68 group-hover:text-[var(--brand-color)]"
                }`}
              >
                {category.nome}
              </span>
              {hasChildren && (
                <ChevronDown
                  className={`h-3.5 w-3.5 text-white/35 transition ${
                    isOpen ? "rotate-180 text-[var(--brand-color)]" : ""
                  }`}
                />
              )}
              {isActive && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 bg-[var(--brand-color)]" aria-hidden="true" />
              )}
            </>
          );

          return hasChildren ? (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                setOpenMenu((current) =>
                  current === category.id ? null : category.id,
                )
              }
              aria-expanded={isOpen}
              aria-controls="desktop-category-panel"
              className="group relative flex shrink-0 items-center gap-2.5 px-4 text-center"
            >
              {content}
            </button>
          ) : (
            <Link
              key={category.id}
              href={href}
              onClick={() => setOpenMenu(null)}
              aria-current={isActive ? "page" : undefined}
              className="group relative flex shrink-0 items-center gap-2.5 px-4 text-center"
            >
              {content}
            </Link>
          );
        })}
      </nav>

      {openMenu && panelRoots.length > 0 && (
        <div
          id="desktop-category-panel"
          className="absolute inset-x-0 top-full z-40 hidden border-b border-white/10 bg-[#0B0B0B]/[0.99] shadow-[0_24px_60px_rgba(0,0,0,0.55)] md:block"
        >
          <div
            className={`mx-auto grid max-h-[min(520px,70vh)] max-w-[1440px] gap-7 overflow-y-auto px-8 py-7 ${
              panelRoots.length > 1
                ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            }`}
          >
            {panelRoots.map((root) => {
              const rootHref = categoryHref(root, categoriesById);
              const descendants = categories.filter((category) =>
                root.descendantIds.includes(category.id),
              );

              return (
                <section key={root.id} aria-labelledby={`category-root-${root.id}`}>
                  <Link
                    id={`category-root-${root.id}`}
                    href={rootHref}
                    onClick={() => setOpenMenu(null)}
                    className="font-display inline-flex text-sm font-bold text-white transition hover:text-[var(--brand-color)]"
                  >
                    {root.nome}
                  </Link>
                  {descendants.length > 0 && (
                    <ul className={`mt-3 gap-x-7 gap-y-1 ${panelRoots.length === 1 ? "grid grid-cols-2 lg:grid-cols-3" : "space-y-1"}`}>
                      {descendants.map((category) => (
                        <li key={category.id}>
                          <Link
                            href={categoryHref(category, categoriesById)}
                            onClick={() => setOpenMenu(null)}
                            className="block rounded-md px-2 py-2 text-xs text-white/60 transition hover:bg-white/[0.04] hover:text-[var(--brand-color)]"
                            style={{
                              paddingLeft: `${Math.max(8, (category.depth - root.depth) * 12)}px`,
                            }}
                          >
                            {category.nome}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
