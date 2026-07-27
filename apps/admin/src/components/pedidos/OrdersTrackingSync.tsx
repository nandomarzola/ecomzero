"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { syncActiveShipmentStatusesAction } from "@/lib/actions/shipping";

const AUTO_SYNC_INTERVAL_MS = 60_000;
const LAST_SYNC_STORAGE_KEY = "ecomzero:admin:tracking-last-sync";

type SyncMessage = {
  tone: "success" | "warning" | "error";
  text: string;
};

export default function OrdersTrackingSync() {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<SyncMessage | null>(null);

  const sync = useCallback(
    async (automatic: boolean) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setIsSyncing(true);
      if (!automatic) setMessage(null);

      try {
        const result = await syncActiveShipmentStatusesAction();
        if (!mountedRef.current) return;
        if (!result.ok) {
          setMessage({ tone: "error", text: result.error });
          return;
        }

        const { checked, failed } = result.data;
        const checkedAt = new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setMessage(
          failed > 0
            ? {
                tone: "warning",
                text: `${checked} rastreio(s) atualizado(s); ${failed} não responderam.`,
              }
            : {
                tone: "success",
                text:
                  checked > 0
                    ? `${checked} rastreio(s) conferido(s) às ${checkedAt}.`
                    : `Nenhum rastreio pendente às ${checkedAt}.`,
              },
        );
        router.refresh();
      } catch {
        if (mountedRef.current) {
          setMessage({
            tone: "error",
            text: "Não foi possível consultar os rastreios agora.",
          });
        }
      } finally {
        if (mountedRef.current) setIsSyncing(false);
        inFlightRef.current = false;
      }
    },
    [router],
  );

  useEffect(() => {
    mountedRef.current = true;

    const runAutomaticSync = () => {
      if (document.visibilityState !== "visible") return;
      const lastSync = Number(
        window.sessionStorage.getItem(LAST_SYNC_STORAGE_KEY) ?? "0",
      );
      if (
        Number.isFinite(lastSync) &&
        Date.now() - lastSync < AUTO_SYNC_INTERVAL_MS
      ) {
        return;
      }
      window.sessionStorage.setItem(
        LAST_SYNC_STORAGE_KEY,
        String(Date.now()),
      );
      void sync(true);
    };

    runAutomaticSync();
    const timer = window.setInterval(
      runAutomaticSync,
      AUTO_SYNC_INTERVAL_MS,
    );
    document.addEventListener("visibilitychange", runAutomaticSync);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", runAutomaticSync);
    };
  }, [sync]);

  const messageStyle =
    message?.tone === "error"
      ? "text-red-300"
      : message?.tone === "warning"
        ? "text-amber-300"
        : "text-white/40";

  return (
    <div className="flex min-h-9 flex-wrap items-center justify-end gap-3">
      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`flex items-center gap-1.5 text-[11px] ${messageStyle}`}
        >
          {message.tone === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-[#A9EC17]" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {message.text}
        </p>
      ) : (
        <p className="text-[11px] text-white/30">
          Rastreios conferidos automaticamente a cada minuto.
        </p>
      )}
      <button
        type="button"
        disabled={isSyncing}
        onClick={() => void sync(false)}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 text-xs font-medium text-white/65 transition hover:border-[#A9EC17]/25 hover:text-white disabled:cursor-wait disabled:opacity-55"
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
        />
        {isSyncing ? "Consultando..." : "Atualizar rastreios"}
      </button>
    </div>
  );
}
