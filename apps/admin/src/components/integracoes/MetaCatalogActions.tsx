"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCheck, Copy, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { validateMetaCatalogAction } from "@/lib/actions/metaCatalog";

const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-[#111111] px-3.5 text-xs font-semibold text-white/65 transition hover:border-[#A9EC17]/30 hover:text-white";

export default function MetaCatalogActions({ feedUrl, validationAvailable }: { feedUrl: string; validationAvailable: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [refreshPending, startRefreshTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setFeedback({ tone: "success", text: "URL do feed copiada." });
    } catch {
      setFeedback({ tone: "error", text: "Não foi possível copiar automaticamente." });
    }
  };

  const validate = () => {
    startTransition(async () => {
      const result = await validateMetaCatalogAction();
      if (!result.ok) {
        setFeedback({ tone: "error", text: result.error });
        return;
      }
      setFeedback({ tone: "success", text: `Catálogo validado: ${result.totalItems} itens elegíveis.` });
      router.refresh();
    });
  };

  const refresh = () => {
    startRefreshTransition(() => {
      router.refresh();
      setFeedback({ tone: "success", text: "Dados atualizados." });
    });
  };

  return (
    <div className="space-y-2 xl:max-w-[760px]">
      <div className="flex flex-wrap gap-2 xl:justify-end">
        <a href={feedUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#A9EC17] px-3.5 text-xs font-bold text-black transition hover:brightness-105">
          <ExternalLink className="h-4 w-4" /> Abrir feed XML
        </a>
        <button type="button" onClick={copyUrl} className={secondaryButton}><Copy className="h-4 w-4" /> Copiar URL</button>
        <button type="button" onClick={validate} disabled={pending || !validationAvailable} className={`${secondaryButton} disabled:cursor-not-allowed disabled:opacity-40`}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />} Validar catálogo
        </button>
        <button type="button" onClick={refresh} disabled={refreshPending} className={`${secondaryButton} disabled:opacity-40`}>
          {refreshPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atualizar dados
        </button>
        <a href={`${feedUrl}?download=1`} className={secondaryButton}><Download className="h-4 w-4" /> Baixar XML</a>
        <a href="#como-conectar-meta" className={secondaryButton}><BookOpen className="h-4 w-4" /> Ver instruções</a>
      </div>
      {feedback ? <p role="status" className={`text-right text-[11px] ${feedback.tone === "success" ? "text-[#A9EC17]" : "text-red-300"}`}>{feedback.text}</p> : null}
    </div>
  );
}
