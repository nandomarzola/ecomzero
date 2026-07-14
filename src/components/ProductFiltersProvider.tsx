"use client";

import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

type ProductFiltersContextValue = {
  cat: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
};

const ProductFiltersContext = createContext<ProductFiltersContextValue>({
  cat: null,
  searchQuery: "",
  setSearchQuery: () => {},
});

export function useProductFilters() {
  return useContext(ProductFiltersContext);
}

// Único ponto da árvore que chama useSearchParams() — isolado aqui, sem
// nenhuma saída visual, para que apenas ESTE componente minúsculo precise do
// Suspense que a API exige. Isso mantém CategoryStrip/Showcase fora do
// congelamento de fallback que o Next aplica durante a geração estática,
// permitindo que renderizem via SSR com o estado padrão (sem filtro).
function CategoryFilterSync({ onChange }: { onChange: (cat: string | null) => void }) {
  const searchParams = useSearchParams();
  const cat = searchParams.get("cat");

  useEffect(() => {
    onChange(cat);
  }, [cat, onChange]);

  return null;
}

export function ProductFiltersProvider({ children }: { children: ReactNode }) {
  const [cat, setCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <ProductFiltersContext.Provider value={{ cat, searchQuery, setSearchQuery }}>
      <Suspense fallback={null}>
        <CategoryFilterSync onChange={setCat} />
      </Suspense>
      {children}
    </ProductFiltersContext.Provider>
  );
}
