import { Barcode, CreditCard, QrCode, type LucideIcon } from "lucide-react";

const METHODS: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Pix", icon: QrCode },
  { label: "Visa", icon: CreditCard },
  { label: "Mastercard", icon: CreditCard },
  { label: "Elo", icon: CreditCard },
  { label: "Amex", icon: CreditCard },
  { label: "Boleto", icon: Barcode },
];

export default function PaymentBadges() {
  return (
    <div>
      <h3 className="font-display text-sm font-bold text-white">
        Formas de pagamento
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {METHODS.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="inline-flex min-h-12 min-w-[58px] flex-col items-center justify-center gap-1 rounded-md border border-white/15 bg-[#090909] px-2.5 text-white/70"
          >
            <Icon className="h-4 w-4 text-[#A9EC17]" strokeWidth={1.7} />
            <span className="text-[8px] font-bold uppercase tracking-wide">{label}</span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-4 text-white/40">
        Disponibilidade confirmada na finalização do pedido.
      </p>
    </div>
  );
}
