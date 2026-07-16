"use client";

import { useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { MapPin, X } from "lucide-react";
import {
  dismissCepModal,
  getCepModalDismissedSnapshot,
  getUserCepSnapshot,
  isValidCep,
  saveUserCep,
  subscribeUserCep,
} from "@/lib/client/cepStorage";

// Modal de captura de CEP na primeira visita — SÓ para visitante não logado,
// sem CEP salvo e que nunca dispensou o modal. Dispensar (X/clique fora) grava
// flag permanente: nunca incomoda de novo neste navegador. Cliente logado usa
// o Address da conta no checkout, não este CEP solto.
//
// No SSR/HTML estático nada é renderizado (snapshots do server = null e
// useSession começa "loading") — o modal só pode aparecer após a hidratação,
// então a home continua ○ Static.
export default function CepCaptureModal() {
  const { status } = useSession();
  const savedCep = useSyncExternalStore(subscribeUserCep, getUserCepSnapshot, () => null);
  const dismissed = useSyncExternalStore(
    subscribeUserCep,
    getCepModalDismissedSnapshot,
    () => null,
  );
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);

  const shouldShow = status === "unauthenticated" && !savedCep && !dismissed;
  if (!shouldShow) return null;

  const handleSave = () => {
    if (!isValidCep(draft)) {
      setInvalid(true);
      return;
    }
    saveUserCep(draft);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) dismissCepModal();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cep-modal-title"
        className="w-full max-w-sm rounded-xl border border-white/12 bg-[#0D0D0D] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-color)]/12 text-[var(--brand-color)]">
              <MapPin className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <h2 id="cep-modal-title" className="font-display text-sm font-bold text-white">
              De onde você é?
            </h2>
          </div>
          <button
            type="button"
            onClick={dismissCepModal}
            aria-label="Fechar"
            className="rounded-md p-1 text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-[11px] leading-5 text-white/60">
          Informe seu CEP para ver prazos e valores de frete direto nas páginas de
          produto — sem precisar digitar toda vez.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={9}
            placeholder="00000-000"
            value={draft}
            aria-label="CEP"
            onChange={(event) => {
              setDraft(event.target.value);
              setInvalid(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSave();
            }}
            className="h-10 min-w-0 flex-1 rounded-md border border-white/15 bg-[#090909] px-3 text-[12px] text-white outline-none transition placeholder:text-white/35 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)]"
          />
          <button
            type="button"
            onClick={handleSave}
            className="h-10 shrink-0 rounded-md bg-[var(--brand-color)] px-4 text-[11px] font-bold text-black transition hover:bg-[#B8FF28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Salvar
          </button>
        </div>
        {invalid && (
          <p className="mt-1.5 text-[10px] text-red-400">CEP inválido — use 8 dígitos.</p>
        )}
      </div>
    </div>
  );
}
