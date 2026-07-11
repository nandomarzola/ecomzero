import { ArrowRight, Truck } from "lucide-react";

export default function DeliveryBanner() {
  return (
    <section className="mx-auto max-w-[1380px] px-5 pb-16 pt-8 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-[#6A1010] bg-[linear-gradient(100deg,#210505,#490C06,#160303)] px-7 py-6 sm:flex-row sm:items-center lg:px-14">
        <div className="flex items-center gap-5">
          <Truck className="h-12 w-12 shrink-0 text-[#A9EC17]" strokeWidth={1.5} />
          <div>
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
              Entrega para todo o Brasil
            </h2>
            <p className="mt-1 text-sm text-white/70">
              Envio rápido, seguro e com código de rastreio.
            </p>
          </div>
        </div>
        <a
          href="#vitrine"
          className="font-display inline-flex min-h-12 w-full items-center justify-center gap-10 rounded-xl bg-[#A9EC17] px-8 py-3 text-sm font-bold text-black transition hover:brightness-110 sm:w-auto"
        >
          SAIBA MAIS
          <ArrowRight className="h-5 w-5" />
        </a>
      </div>
    </section>
  );
}
