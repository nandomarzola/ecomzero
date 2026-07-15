"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapPin } from "lucide-react";
import {
  formatCep,
  getUserCepSnapshot,
  isValidCep,
  saveUserCep,
  subscribeUserCep,
} from "@/lib/client/cepStorage";

// Botão "Informe seu CEP" do header. Lê o CEP salvo reativamente (o modal da
// home e outras abas atualizam na hora). No SSR renderiza o estado "sem CEP"
// (snapshot do server é null) — após a hidratação mostra o CEP salvo.
export default function HeaderCepButton() {
  const savedCep = useSyncExternalStore(subscribeUserCep, getUserCepSnapshot, () => null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggleOpen = () => {
    setOpen((current) => {
      const next = !current;
      if (next) {
        setDraft(savedCep ? formatCep(savedCep) : "");
        setInvalid(false);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!isValidCep(draft)) {
      setInvalid(true);
      return;
    }
    saveUserCep(draft);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition hover:bg-white/5"
      >
        <MapPin className="h-4 w-4 shrink-0 text-[#A9EC17]" strokeWidth={1.8} />
        <span className="flex flex-col leading-tight">
          {savedCep ? (
            <>
              <span className="text-[9px] uppercase tracking-wide text-white/45">Enviar para</span>
              <span className="text-[11px] font-semibold text-white">CEP: {formatCep(savedCep)}</span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-semibold text-white">Informe seu CEP</span>
              <span className="text-[9px] text-white/45">Calcular frete</span>
            </>
          )}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Informar CEP"
          className="absolute left-0 top-full z-50 mt-2 w-60 rounded-lg border border-white/12 bg-[#0D0D0D] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
        >
          <label htmlFor="header-cep" className="text-[10px] font-medium text-white/65">
            Seu CEP
          </label>
          <div className="mt-1.5 flex gap-1.5">
            <input
              id="header-cep"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={9}
              placeholder="00000-000"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setInvalid(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSave();
              }}
              className="h-9 min-w-0 flex-1 rounded-md border border-white/15 bg-[#090909] px-2.5 text-[11px] text-white outline-none transition placeholder:text-white/35 focus:border-[#A9EC17] focus:ring-1 focus:ring-[#A9EC17]"
            />
            <button
              type="button"
              onClick={handleSave}
              className="h-9 shrink-0 rounded-md bg-[#A9EC17] px-3 text-[10px] font-bold text-black transition hover:bg-[#B8FF28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Salvar
            </button>
          </div>
          {invalid && (
            <p className="mt-1.5 text-[10px] text-red-400">CEP inválido — use 8 dígitos.</p>
          )}
        </div>
      )}
    </div>
  );
}
