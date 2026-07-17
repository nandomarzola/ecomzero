"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Estado da busca da loja: guarda o texto do campo de busca do header
// (SearchBar). Ao dar Enter, a SearchBar navega para /busca?q=… (a página
// /busca renderiza os resultados server-side). O filtro por categoria (?cat=)
// foi removido — navegação por categoria usa /categorias/[...slug]. Sem
// `useSearchParams()` aqui: não lê nada da URL, então não precisa de <Suspense>.
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
