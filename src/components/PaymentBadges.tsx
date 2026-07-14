const METHODS = ["Pix", "Visa", "Mastercard", "Elo", "Amex", "Boleto"];

export default function PaymentBadges() {
  return (
    <div>
      <h3 className="font-display text-sm font-bold text-white">
        Formas de pagamento
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {METHODS.map((method) => (
          <span
            key={method}
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/15 bg-[#090909] px-3 text-[9px] font-bold uppercase tracking-wide text-white/70"
          >
            {method}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-4 text-white/40">
        Disponibilidade confirmada na finalização do pedido.
      </p>
    </div>
  );
}
