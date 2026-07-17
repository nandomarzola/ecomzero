"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Package,
  PackageCheck,
  RefreshCw,
  Truck,
} from "lucide-react";

type NotificationType =
  | "payment_confirmed"
  | "order_preparing"
  | "order_in_transit"
  | "order_delivered";

type NotificationItem = {
  id: string;
  orderId: string;
  type: NotificationType;
  title: string;
  message: string;
  lida: boolean;
  lidaEm: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
  error?: string;
};

type NotificationBellProps = {
  enabled: boolean;
  compact?: boolean;
  onOpen?: () => void;
};

const notificationIcons = {
  payment_confirmed: BadgeCheck,
  order_preparing: Package,
  order_in_transit: Truck,
  order_delivered: PackageCheck,
};

function subscribeToMobileViewport(callback: () => void) {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getMobileViewportSnapshot() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  );
  if (elapsedMinutes < 1) return "Agora";
  if (elapsedMinutes < 60) return `Há ${elapsedMinutes} min`;
  if (elapsedMinutes < 1_440) {
    const hours = Math.floor(elapsedMinutes / 60);
    return `Há ${hours} h`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function NotificationBell({
  enabled,
  compact = false,
  onOpen,
}: NotificationBellProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobileViewport = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    () => false,
  );
  const isActiveViewport = compact ? isMobileViewport : !isMobileViewport;
  const active = enabled && isActiveViewport;

  const loadNotifications = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/account/notifications", {
        cache: "no-store",
        signal,
      });
      const data = (await response.json().catch(() => null)) as
        | NotificationsResponse
        | null;
      if (!response.ok || !data) {
        throw new Error(data?.error ?? "Não foi possível carregar as notificações.");
      }

      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setError(null);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Não foi possível carregar as notificações.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => {
      void loadNotifications(controller.signal);
    }, 0);
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);
    const handleFocus = () => void loadNotifications();
    window.addEventListener("focus", handleFocus);

    return () => {
      controller.abort();
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [active, loadNotifications]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!active) return null;

  const togglePanel = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      onOpen?.();
      void loadNotifications();
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.lida) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, lida: true } : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));

      const response = await fetch(
        `/api/account/notifications/${notification.id}/read`,
        { method: "POST" },
      ).catch(() => null);
      if (!response?.ok) {
        void loadNotifications();
      }
    }

    setOpen(false);
    router.push(`/conta/pedidos/${notification.orderId}`);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePanel}
        aria-label={
          unreadCount > 0
            ? `Notificações: ${unreadCount} não lidas`
            : "Notificações"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        className="header-action relative inline-flex h-11 w-11 items-center justify-center text-white transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            className="font-display absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-color)] px-1 text-[8px] font-extrabold leading-none text-black ring-2 ring-black"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Notificações dos pedidos"
          className={
            compact
              ? "fixed inset-x-4 top-[68px] z-[80] max-h-[min(520px,calc(100vh-84px))] overflow-hidden rounded-xl border border-white/[0.12] bg-[#101010] shadow-2xl shadow-black/80"
              : "absolute right-0 top-[calc(100%+10px)] z-[80] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/[0.12] bg-[#101010] shadow-2xl shadow-black/80"
          }
        >
          <header className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                Notificações
              </h2>
              <p className="mt-0.5 text-[10px] text-white/45">
                Atualizações dos seus pedidos
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[var(--brand-color)]/10 px-2 py-1 text-[9px] font-semibold text-[var(--brand-color)]">
                {unreadCount} {unreadCount === 1 ? "nova" : "novas"}
              </span>
            )}
          </header>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {loading && notifications.length === 0 ? (
              <div className="space-y-2 p-2" aria-label="Carregando notificações">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-[76px] animate-pulse rounded-lg bg-white/[0.04]"
                  />
                ))}
              </div>
            ) : error && notifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <Bell className="h-7 w-7 text-amber-300" strokeWidth={1.5} />
                <p className="mt-3 text-xs font-semibold text-white">
                  Não foi possível carregar
                </p>
                <p className="mt-1 text-[10px] leading-4 text-white/45">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    void loadNotifications();
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded border border-white/15 px-3 py-2 text-[10px] font-semibold text-white/70 transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Tentar novamente
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <Bell className="h-8 w-8 text-white/25" strokeWidth={1.4} />
                <p className="mt-3 text-xs font-semibold text-white/75">
                  Nenhuma notificação ainda
                </p>
                <p className="mt-1 text-[10px] leading-4 text-white/40">
                  As atualizações dos seus pedidos aparecerão aqui.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type];
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => void openNotification(notification)}
                        className={`flex w-full gap-3 rounded-lg px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] ${
                          notification.lida
                            ? "hover:bg-white/[0.04]"
                            : "bg-[var(--brand-color)]/[0.06] hover:bg-[var(--brand-color)]/[0.1]"
                        }`}
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)]">
                          <Icon className="h-4 w-4" strokeWidth={1.7} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-2">
                            <strong className="font-display min-w-0 flex-1 text-[11px] font-semibold text-white">
                              {notification.title}
                            </strong>
                            {!notification.lida && (
                              <span
                                aria-label="Não lida"
                                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-color)]"
                              />
                            )}
                          </span>
                          <span className="mt-1 block text-[10px] leading-4 text-white/55">
                            {notification.message}
                          </span>
                          <span className="mt-1.5 block text-[9px] text-white/30">
                            {formatNotificationDate(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
