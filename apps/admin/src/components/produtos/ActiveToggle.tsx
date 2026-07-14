"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProductActiveAction } from "@/lib/actions/product";

// Toggle de ativo/inativo (soft-delete). Chama a action e revalida a listagem.
export default function ActiveToggle({ id, ativo }: { id: string; ativo: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setProductActiveAction(id, !ativo);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${
        ativo
          ? "bg-[#A9EC17]/15 text-[#A9EC17] hover:bg-[#A9EC17]/25"
          : "bg-white/10 text-white/50 hover:bg-white/20"
      }`}
    >
      {ativo ? "Ativo" : "Inativo"}
    </button>
  );
}
