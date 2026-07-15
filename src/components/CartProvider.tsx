"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getCartSummaryAction } from "@/lib/actions/cartActions";

type CartContextValue = {
  itemCount: number;
  refreshCartCount: () => void;
};

const CartContext = createContext<CartContextValue>({
  itemCount: 0,
  refreshCartCount: () => {},
});

export function useCartCount() {
  return useContext(CartContext);
}

// Mantém o Header (e portanto "/") fora do congelamento de cookies() —
// a contagem do carrinho é hidratada no client via Server Action, não lida
// direto num Server Component. Ver getCartSummaryAction em cartActions.ts.
export function CartProvider({ children }: { children: ReactNode }) {
  const [itemCount, setItemCount] = useState(0);

  const refreshCartCount = useCallback(() => {
    void getCartSummaryAction()
      .then((summary) => setItemCount(summary.itemCount))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

  return (
    <CartContext.Provider value={{ itemCount, refreshCartCount }}>
      {children}
    </CartContext.Provider>
  );
}
