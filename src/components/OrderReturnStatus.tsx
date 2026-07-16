"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  Home,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

type OrderReturnStatusProps = {
  tone: "success" | "pending" | "failure";
  title: string;
  description: string;
  orderId: string;
  initialOrderStatus:
    | "draft"
    | "aguardando_pagamento"
    | "pago"
    | "cancelado"
    | null;
};

const styles: Record<
  OrderReturnStatusProps["tone"],
  { icon: LucideIcon; color: string; background: string }
> = {
  success: {
    icon: ShieldCheck,
    color: "text-[var(--brand-color)]",
    background: "bg-[var(--brand-color)]/10 border-[var(--brand-color)]/20",
  },
  pending: {
    icon: Clock3,
    color: "text-amber-300",
    background: "bg-amber-300/10 border-amber-300/20",
  },
  failure: {
    icon: AlertTriangle,
    color: "text-red-300",
    background: "bg-red-300/10 border-red-300/20",
  },
};

export default function OrderReturnStatus({
  tone,
  title,
  description,
  orderId,
  initialOrderStatus,
}: OrderReturnStatusProps) {
  const [orderStatus, setOrderStatus] = useState(initialOrderStatus);
  const effectiveTone =
    orderStatus === "pago"
      ? "success"
      : orderStatus === "cancelado"
        ? "failure"
        : tone;
  const effectiveTitle =
    orderStatus === "pago" ? "Pagamento confirmado" : title;
  const effectiveDescription =
    orderStatus === "pago"
      ? "Seu pagamento foi aprovado pelo Mercado Pago e o pedido já está confirmado."
      : description;
  const style = styles[effectiveTone];
  const Icon = style.icon;

  useEffect(() => {
    if (orderStatus !== "aguardando_pagamento") return;

    const controller = new AbortController();
    const refreshStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          status?: OrderReturnStatusProps["initialOrderStatus"];
        };
        if (data.status) setOrderStatus(data.status);
      } catch {
        return;
      }
    };

    void refreshStatus();
    const interval = window.setInterval(refreshStatus, 3_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [orderId, orderStatus]);

  return (
    <div className="min-h-[65vh] bg-[#050505] px-4 py-16 sm:py-24">
      <section className="mx-auto max-w-[620px] rounded-2xl border border-white/[0.11] bg-[linear-gradient(145deg,#101010,#090909)] p-7 text-center shadow-2xl shadow-black sm:p-10">
        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${style.background}`}
        >
          <Icon className={`h-7 w-7 ${style.color}`} strokeWidth={1.8} />
        </span>
        <p className={`mt-6 text-[10px] font-bold uppercase tracking-[0.22em] ${style.color}`}>
          {orderStatus === "pago" ? "Pagamento aprovado" : "Pedido recebido"}
        </p>
        <h1 className="font-display mt-2 text-[28px] font-extrabold leading-tight text-white sm:text-[34px]">
          {effectiveTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-[480px] text-sm leading-6 text-white/55">
          {effectiveDescription}
        </p>
        <div className="mt-7 rounded-lg border border-white/[0.08] bg-black/30 px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/35">
            Identificador do pedido
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-white/65">{orderId}</p>
        </div>
        <p className="mt-5 text-[11px] leading-5 text-white/38">
          {orderStatus === "pago"
            ? "Confirmação validada diretamente com o Mercado Pago."
            : "O status definitivo será atualizado somente após a confirmação segura do provedor."}
        </p>
        <Link
          href="/"
          className="font-display mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--brand-color)] px-6 text-xs font-extrabold uppercase text-black transition hover:bg-[#B8FF28]"
        >
          <Home className="h-4 w-4" />
          Voltar para a loja
        </Link>
      </section>
    </div>
  );
}
