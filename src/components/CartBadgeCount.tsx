"use client";

import { useCartCount } from "@/components/CartProvider";

export default function CartBadgeCount() {
  const { itemCount } = useCartCount();

  if (itemCount === 0) return null;

  return (
    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#A9EC17] px-1 text-[10px] font-bold text-black">
      {itemCount}
    </span>
  );
}
