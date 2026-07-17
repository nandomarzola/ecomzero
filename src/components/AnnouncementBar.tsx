"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { getUserUfSnapshot, saveUserUf, subscribeUserCep } from "@/lib/client/cepStorage";
import { isAnnouncementEligibleForUf } from "@/lib/client/announcementRegion";

type AnnouncementItem = {
  id: string;
  texto: string;
  link: string | null;
  // Siglas de UF elegíveis. Vazio = sem restrição (aparece pra todos).
  regioesElegiveis: string[];
};

function contrastText(hexColor: string) {
  const hex = hexColor.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 150 ? "#050505" : "#FFFFFF";
}

// Uma mensagem entra na rotação se não tiver restrição de região OU se a UF do
// visitante estiver na lista. Sem UF conhecida (visitante novo, modal dispensado),
// mensagens restritas NÃO aparecem — fail-safe para não prometer frete inviável.
export default function AnnouncementBar({
  items,
  rotationSeconds,
  backgroundColor,
}: {
  items: AnnouncementItem[];
  rotationSeconds: number;
  backgroundColor: string;
}) {
  const { status } = useSession();
  // UF resolvida do CEP (modal/header/checkout), lida reativamente do localStorage.
  const storedUf = useSyncExternalStore(subscribeUserCep, getUserUfSnapshot, () => null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Cliente logado sem UF salva: semeia a UF a partir do endereço padrão da conta,
  // sem pedir CEP. Roda uma vez (quando autentica e ainda não há UF no storage).
  useEffect(() => {
    if (status !== "authenticated" || storedUf) return;
    let active = true;
    fetch("/api/account/addresses", { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { addresses?: { uf?: string; padrao?: boolean }[] } | null) => {
        if (!active || !data?.addresses?.length) return;
        const preferred = data.addresses.find((address) => address.padrao) ?? data.addresses[0];
        if (preferred?.uf) saveUserUf(preferred.uf);
      })
      .catch(() => {
        // Sem endereço acessível: segue sem UF (mensagens restritas ocultas).
      });
    return () => {
      active = false;
    };
  }, [status, storedUf]);

  const visibleItems = items.filter((item) =>
    isAnnouncementEligibleForUf(item.regioesElegiveis, storedUf),
  );

  useEffect(() => {
    if (visibleItems.length <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(
      () => setActiveIndex((current) => current + 1),
      Math.min(30, Math.max(3, rotationSeconds)) * 1000,
    );
    return () => window.clearInterval(interval);
  }, [visibleItems.length, rotationSeconds]);

  if (visibleItems.length === 0) return null;
  const currentItem = visibleItems[activeIndex % visibleItems.length];
  const textColor = contrastText(backgroundColor);
  const content = <span className="line-clamp-1">{currentItem.texto}</span>;

  return (
    <aside
      aria-label="Anúncios da loja"
      className="relative z-[51] min-h-8 px-14 py-2 text-center font-display text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor, color: textColor }}
    >
      <div aria-live="polite" aria-atomic="true">
        {currentItem.link ? <a href={currentItem.link} className="inline-block max-w-full hover:underline">{content}</a> : content}
      </div>
      {visibleItems.length > 1 ? (
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5" aria-label="Selecionar anúncio">
          {visibleItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Mostrar anúncio ${index + 1}`}
              aria-current={index === activeIndex % visibleItems.length}
              className={`h-1.5 rounded-full bg-current transition-all ${index === activeIndex % visibleItems.length ? "w-4 opacity-90" : "w-1.5 opacity-35 hover:opacity-65"}`}
            />
          ))}
        </div>
      ) : null}
    </aside>
  );
}
