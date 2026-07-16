"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Filtro de busca da loja (SearchBar no header + Showcase na home). O filtro
// por categoria (?cat=) foi removido — a navegação por categoria agora usa as
// rotas reais /categorias/[...slug]. Sem `useSearchParams()` aqui: este provider
// não lê mais nada da URL, então não precisa mais do isolamento em <Suspense>.
type ProductFiltersContextValue = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
};

const ProductFiltersContext = createContext<ProductFiltersContextValue>({
  searchQuery: "",
  setSearchQuery: () => {},
});

export function useProductFilters() {
  return useContext(ProductFiltersContext);
}

export function ProductFiltersProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <ProductFiltersContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </ProductFiltersContext.Provider>
  );
}
