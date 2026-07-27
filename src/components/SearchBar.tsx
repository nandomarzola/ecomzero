"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProductFilters } from "@/components/ProductFiltersProvider";

export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const { searchQuery, setSearchQuery } = useProductFilters();
  const router = useRouter();

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = searchQuery.trim();
        router.push(q ? `/busca?q=${encodeURIComponent(q)}` : "/busca");
      }}
      className={`relative block ${compact ? "h-11 w-11 overflow-hidden transition-[width] duration-[250ms] focus-within:w-[260px]" : "w-full"}`}
    >
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="O que você está procurando?"
        aria-label="Buscar produtos"
        className={compact
          ? "h-11 w-full cursor-pointer rounded-xl border border-transparent bg-transparent p-0 text-transparent caret-transparent placeholder:text-transparent focus:cursor-text focus:border-white/10 focus:bg-[#0F0F0F] focus:py-0 focus:pl-12 focus:pr-4 focus:text-sm focus:text-white focus:caret-[var(--brand-color)] focus:outline-none focus:placeholder:text-white/40"
          : "h-12 w-full rounded-[9px] border border-white/15 bg-[#0A0A0A] py-2.5 pl-4 pr-12 text-sm text-white placeholder:text-white/45 focus:border-[var(--brand-color)]/55 focus:outline-none"
        }
      />
      <button
        type="submit"
        aria-label="Pesquisar"
        className={`absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md text-white/65 transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] ${
          compact
            ? "left-1 h-9 w-9 text-white/90"
            : "right-2 h-9 w-9"
        }`}
      >
        <Search
          className={compact ? "h-[22px] w-[22px]" : "h-5 w-5"}
          strokeWidth={2}
        />
      </button>
    </form>
  );
}
