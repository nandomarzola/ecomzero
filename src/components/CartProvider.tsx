"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addToCartAction,
  applyCouponAction,
  autoApplyFirstPurchaseCouponAction,
  clearCartItemsAction,
  getCartAction,
  removeCartItemAction,
  removeCouponAction,
  updateCartItemAction,
  type CartActionResult,
} from "@/lib/actions/cartActions";
import type { Cart } from "@/types/cart";

const EMPTY_CART: Cart = {
  id: null,
  items: [],
  subtotal: 0,
  discount: 0,
  total: 0,
  itemCount: 0,
  coupon: null,
};

type AddItemOptions = {
  openDrawer?: boolean;
};

type CartContextValue = {
  cart: Cart;
  itemCount: number;
  isOpen: boolean;
  isLoading: boolean;
  isMutating: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  clearCart: () => void;
  clearCartItems: () => Promise<CartActionResult>;
  refreshCart: () => Promise<Cart>;
  refreshCartCount: () => void;
  addItem: (
    variantId: string,
    quantidade: number,
    options?: AddItemOptions,
  ) => Promise<CartActionResult>;
  updateQuantity: (
    itemId: string,
    quantidade: number,
  ) => Promise<CartActionResult>;
  removeItem: (itemId: string) => Promise<CartActionResult>;
  applyCoupon: (code: string) => Promise<CartActionResult>;
  autoApplyFirstPurchaseCoupon: (code: string) => Promise<CartActionResult>;
  removeCoupon: () => Promise<CartActionResult>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart deve ser usado dentro de CartProvider");
  }
  return context;
}

export const useCartCount = useCart;

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mutationCount, setMutationCount] = useState(0);
  const requestSequence = useRef(0);

  const syncCart = useCallback((nextCart: Cart) => {
    requestSequence.current += 1;
    setCart(nextCart);
    setIsLoading(false);
    return nextCart;
  }, []);

  const refreshCart = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setIsLoading(true);
    try {
      const nextCart = await getCartAction();
      if (requestSequence.current === sequence) {
        setCart(nextCart);
      }
      return nextCart;
    } finally {
      if (requestSequence.current === sequence) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    void getCartAction()
      .then((nextCart) => {
        if (requestSequence.current === sequence) setCart(nextCart);
      })
      .catch(() => {})
      .finally(() => {
        if (requestSequence.current === sequence) setIsLoading(false);
      });
  }, []);

  const runMutation = useCallback(
    async (mutation: () => Promise<CartActionResult>) => {
      setMutationCount((current) => current + 1);
      try {
        const result = await mutation();
        if (result.success) syncCart(result.cart);
        return result;
      } finally {
        setMutationCount((current) => Math.max(0, current - 1));
      }
    },
    [syncCart],
  );

  const addItem = useCallback(
    async (
      variantId: string,
      quantidade: number,
      options: AddItemOptions = {},
    ) => {
      const result = await runMutation(() =>
        addToCartAction({ variantId, quantidade }),
      );

      if (result.success) {
        if (options.openDrawer !== false) setIsOpen(true);
      }

      return result;
    },
    [runMutation],
  );

  const updateQuantity = useCallback(
    (itemId: string, quantidade: number) =>
      runMutation(() => updateCartItemAction({ itemId, quantidade })),
    [runMutation],
  );

  const removeItem = useCallback(
    (itemId: string) =>
      runMutation(() => removeCartItemAction({ itemId })),
    [runMutation],
  );

  const applyCoupon = useCallback(
    (code: string) => runMutation(() => applyCouponAction(code)),
    [runMutation],
  );

  const autoApplyFirstPurchaseCoupon = useCallback(
    (code: string) => runMutation(() => autoApplyFirstPurchaseCouponAction(code)),
    [runMutation],
  );

  const removeCoupon = useCallback(
    () => runMutation(() => removeCouponAction()),
    [runMutation],
  );

  const clearCartItems = useCallback(
    () => runMutation(() => clearCartItemsAction()),
    [runMutation],
  );

  const openCart = useCallback(() => setIsOpen(true), []);

  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((current) => !current), []);
  const clearCart = useCallback(() => {
    syncCart(EMPTY_CART);
    setIsOpen(false);
  }, [syncCart]);
  const refreshCartCount = useCallback(() => {
    void refreshCart().catch(() => {});
  }, [refreshCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount: cart.itemCount,
        isOpen,
        isLoading,
        isMutating: mutationCount > 0,
        openCart,
        closeCart,
        toggleCart,
        clearCart,
        clearCartItems,
        refreshCart,
        refreshCartCount,
        addItem,
        updateQuantity,
        removeItem,
        applyCoupon,
        autoApplyFirstPurchaseCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
