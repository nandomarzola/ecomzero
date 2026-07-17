import { MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/storeSettingsDomain";

export default function FloatingWhatsApp({ phone, message }: { phone: string; message: string }) {
  const href = whatsappUrl(phone, message);
  if (!href) return null;
  return <a href={href} target="_blank" rel="noreferrer" aria-label="Falar com a loja pelo WhatsApp" title="Falar pelo WhatsApp" className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brand-color)]/50 bg-[#10150a] text-[var(--brand-color)] shadow-[0_12px_35px_rgba(0,0,0,0.5)] transition hover:scale-105 hover:bg-[var(--brand-color)] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] md:bottom-6 md:right-6"><MessageCircle className="h-5 w-5" /></a>;
}
