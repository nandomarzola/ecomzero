"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, X } from "lucide-react";

export type ConfirmDialogOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning";
};

type ConfirmDialogRequest = {
  options: ConfirmDialogOptions;
  resolve: (confirmed: boolean) => void;
  trigger: HTMLElement | null;
};

type ConfirmDialogContextValue = (
  options: ConfirmDialogOptions,
) => Promise<boolean>;

const ConfirmDialogContext =
  createContext<ConfirmDialogContextValue | null>(null);

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmDialogRequest | null>(null);
  const requestRef = useRef<ConfirmDialogRequest | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  const confirmDialog = useCallback(
    (options: ConfirmDialogOptions) =>
      new Promise<boolean>((resolve) => {
        requestRef.current?.resolve(false);
        const nextRequest = {
          options,
          resolve,
          trigger:
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null,
        };
        requestRef.current = nextRequest;
        setRequest(nextRequest);
      }),
    [],
  );

  const settle = useCallback((confirmed: boolean) => {
    const activeRequest = requestRef.current;
    if (!activeRequest) return;
    requestRef.current = null;
    setRequest(null);
    activeRequest.resolve(confirmed);
    window.setTimeout(() => activeRequest.trigger?.focus(), 0);
  }, []);

  useEffect(
    () => () => {
      requestRef.current?.resolve(false);
      requestRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!request) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(
      () => cancelButtonRef.current?.focus(),
      30,
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        settle(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [request, settle]);

  const options = request?.options;
  const isDanger = options?.tone !== "warning";

  return (
    <ConfirmDialogContext.Provider value={confirmDialog}>
      {children}
      {options ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) settle(false);
          }}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/80 outline-none"
          >
            <button
              type="button"
              onClick={() => settle(false)}
              aria-label="Fechar confirmação"
              className="absolute right-4 top-4 rounded-full p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 pr-14 sm:p-7 sm:pr-16">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  isDanger
                    ? "bg-red-500/10 text-red-300"
                    : "bg-amber-400/10 text-amber-300"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h2
                id={titleId}
                className="font-display mt-5 text-xl font-bold text-white"
              >
                {options.title}
              </h2>
              <p
                id={descriptionId}
                className="mt-2 text-sm leading-6 text-white/58"
              >
                {options.description}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] bg-black/20 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={() => settle(false)}
                className="min-h-11 rounded-lg border border-white/12 px-5 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              >
                {options.cancelLabel ?? "Cancelar"}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className={`min-h-11 rounded-lg px-5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  isDanger
                    ? "bg-red-500 text-white hover:bg-red-400 focus-visible:outline-red-300"
                    : "bg-[#A9EC17] text-black hover:brightness-110 focus-visible:outline-[#A9EC17]"
                }`}
              >
                {options.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error(
      "useConfirmDialog deve ser usado dentro de ConfirmDialogProvider.",
    );
  }
  return context;
}
