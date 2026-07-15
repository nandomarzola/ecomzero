"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

export default function ThermalLabelPrint({
  orderId,
  autoPrint,
}: {
  orderId: string;
  autoPrint: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!loaded || !autoPrint) return;
    const timeout = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timeout);
  }, [autoPrint, loaded]);

  return (
    <div className="thermal-print-root min-h-[calc(100vh-8rem)]">
      <div className="thermal-print-controls mb-5 flex flex-wrap items-center gap-2">
        <Link href={`/pedidos/${orderId}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar ao pedido
        </Link>
        <button type="button" onClick={() => window.print()} disabled={!loaded} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">
          <Printer className="h-4 w-4" /> Imprimir 10×15
        </button>
      </div>

      <div className="thermal-label-sheet mx-auto flex h-[150mm] w-[100mm] items-center justify-center overflow-hidden bg-white shadow-2xl shadow-black/60">
        {!loaded && !error ? <Loader2 className="h-8 w-8 animate-spin text-black/30" /> : null}
        {error ? <p className="px-8 text-center text-sm text-red-700">Não foi possível carregar a etiqueta. Confirme se ela já foi gerada no Melhor Envio.</p> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/orders/${orderId}/label/jpeg`}
          alt={`Etiqueta térmica do pedido ${orderId.slice(0, 8)}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`${loaded ? "block" : "hidden"} h-full w-full object-contain`}
        />
      </div>

      <style jsx global>{`
        @page {
          size: 100mm 150mm;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 100mm !important;
            height: 150mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .thermal-print-root,
          .thermal-print-root * {
            visibility: visible !important;
          }

          .thermal-print-root {
            position: fixed !important;
            inset: 0 !important;
            width: 100mm !important;
            height: 150mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .thermal-print-controls {
            display: none !important;
          }

          .thermal-label-sheet {
            width: 100mm !important;
            height: 150mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
