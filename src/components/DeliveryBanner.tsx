import { ArrowRight, Truck } from "lucide-react";

export default function DeliveryBanner() {
  return (
    <section className="mx-auto max-w-[1380px] px-4 pb-10 pt-6 sm:px-5 sm:pb-16 sm:pt-8 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-5 rounded-xl border border-[#6A1010] bg-[linear-gradient(100deg,#210505,#490C06,#160303)] px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-7 sm:py-6 lg:px-14">
        <div className="flex items-center gap-4 sm:gap-5">
          <Truck className="h-10 w-10 shrink-0 text-[#A9EC17] sm:h-12 sm:w-12" strokeWidth={1.5} />
          <div>
            <h2 className="font-display text-lg font-bold text-white sm:text-2xl">
              Entrega para todo o Brasil
            </h2>
            <p className="mt-1 text-xs text-white/70 sm:text-sm">
              Envio rápido, seguro e com código de rastreio.
            </p>
          </div>
        </div>
        <a
          href="#vitrine"
          className="font-display inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#A9EC17] px-8 py-3 text-sm font-bold text-black transition hover:brightness-110 sm:w-auto"
        >
          SAIBA MAIS
          <ArrowRight className="h-5 w-5" />
        </a>
      </div>
    </section>
  );
}
