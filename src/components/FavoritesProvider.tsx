"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  getFavoriteIdsAction,
  toggleFavoriteAction,
} from "@/lib/actions/favoriteActions";

type FavoritesContextValue = {
  // Só fica true depois de hidratar a sessão — o coração só aparece logado.
  isAuthenticated: boolean;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites deve ser usado dentro de FavoritesProvider");
  }
  return context;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const sessionUserId = session?.user?.id ?? null;
  const isAuthenticated =
    status === "authenticated" &&
    sessionUserId !== null &&
    loadedForUserId === sessionUserId;

  useEffect(() => {
    if (status !== "authenticated" || !sessionUserId) return;

    let active = true;
    getFavoriteIdsAction()
      .then((result) => {
        if (!active) return;
        if (!result.authenticated) {
          setLoadedForUserId(null);
          return;
        }
        setIds(new Set(result.ids));
        setLoadedForUserId(sessionUserId);
      })
      .catch(() => {
        if (active) setLoadedForUserId(null);
      });
    return () => {
      active = false;
    };
  }, [sessionUserId, status]);

  const isFavorite = useCallback(
    (productId: string) => ids.has(productId),
    [ids],
  );

  const toggle = useCallback(
    (productId: string) => {
      const wasFavorite = ids.has(productId);

      // Otimista: reflete na hora.
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(productId);
        else next.add(productId);
        return next;
      });

      toggleFavoriteAction(productId)
        .then((result) => {
          if (!result.ok) {
            // Rollback + aviso.
            setIds((prev) => {
              const next = new Set(prev);
              if (wasFavorite) next.add(productId);
              else next.delete(productId);
              return next;
            });
            toast.error(result.error);
            return;
          }
          // Reconcilia com a verdade do servidor.
          setIds((prev) => {
            const next = new Set(prev);
            if (result.favorited) next.add(productId);
            else next.delete(productId);
            return next;
          });
        })
        .catch(() => {
          setIds((prev) => {
            const next = new Set(prev);
            if (wasFavorite) next.add(productId);
            else next.delete(productId);
            return next;
          });
          toast.error("Não foi possível atualizar os favoritos.");
        });
    },
    [ids],
  );

  return (
    <FavoritesContext.Provider value={{ isAuthenticated, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}
