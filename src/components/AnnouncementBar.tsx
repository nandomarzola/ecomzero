"use client";

import { useEffect, useState } from "react";

type AnnouncementItem = {
  id: string;
  texto: string;
  link: string | null;
};

function contrastText(hexColor: string) {
  const hex = hexColor.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 150 ? "#050505" : "#FFFFFF";
}

export default function AnnouncementBar({
  items,
  rotationSeconds,
  backgroundColor,
}: {
  items: AnnouncementItem[];
  rotationSeconds: number;
  backgroundColor: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const currentItem = items[activeIndex % items.length];

  useEffect(() => {
    if (items.length <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(
      () => setActiveIndex((current) => current + 1),
      Math.min(30, Math.max(3, rotationSeconds)) * 1000,
    );
    return () => window.clearInterval(interval);
  }, [items.length, rotationSeconds]);

  if (!currentItem) return null;
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
      {items.length > 1 ? (
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5" aria-label="Selecionar anúncio">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Mostrar anúncio ${index + 1}`}
              aria-current={index === activeIndex % items.length}
              className={`h-1.5 rounded-full bg-current transition-all ${index === activeIndex % items.length ? "w-4 opacity-90" : "w-1.5 opacity-35 hover:opacity-65"}`}
            />
          ))}
        </div>
      ) : null}
    </aside>
  );
}
