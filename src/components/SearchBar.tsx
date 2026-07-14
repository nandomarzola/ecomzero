"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useProductFilters } from "@/components/ProductFiltersProvider";

export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const { searchQuery, setSearchQuery } = useProductFilters();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label
      className={`relative block ${compact ? "h-11 w-11 overflow-hidden transition-[width] duration-[250ms] focus-within:w-[260px]" : "w-full"}`}
    >
      <Search
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${compact ? "left-[11px] h-[22px] w-[22px] text-white/90" : "right-4 h-5 w-5 text-white/65"}`}
        strokeWidth={2}
      />
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && pathname !== "/") {
            event.preventDefault();
            router.push("/#vitrine");
          }
        }}
        placeholder="O que você está procurando?"
        aria-label="Buscar produtos"
        className={compact
          ? "h-11 w-full cursor-pointer rounded-xl border border-transparent bg-transparent p-0 text-transparent caret-transparent placeholder:text-transparent focus:cursor-text focus:border-white/10 focus:bg-[#0F0F0F] focus:py-0 focus:pl-12 focus:pr-4 focus:text-sm focus:text-white focus:caret-[#A9EC17] focus:outline-none focus:placeholder:text-white/40"
          : "h-12 w-full rounded-[9px] border border-white/15 bg-[#0A0A0A] py-2.5 pl-4 pr-12 text-sm text-white placeholder:text-white/45 focus:border-[#A9EC17]/55 focus:outline-none"
        }
      />
    </label>
  );
}
