import Link from "next/link";
import { ArrowRight, Truck } from "lucide-react";

function BrazilMap() {
  return (
    <svg
      viewBox="0 0 220 180"
      className="pointer-events-none absolute right-40 top-1/2 hidden h-40 w-52 -translate-y-1/2 text-[#A9EC17] lg:block"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M71 10 93 18l16-7 15 9 15-2 13 11 17 3 13 13 18 6-10 13 4 13-11 12-7 19-14 11-8 18-14 11-9 20-13 12-10-14-14-7-6-15-16-8-8-15-14-9-4-15-14-9-7-16 13-13 6-16 13-8-1-13Z"
        fill="currentColor"
        fillOpacity="0.025"
        stroke="currentColor"
        strokeOpacity="0.16"
        strokeWidth="1.5"
      />
      <path
        d="M20 101c33-15 54 3 79 5 29 3 43-23 84-30"
        stroke="currentColor"
        strokeOpacity="0.08"
        strokeDasharray="3 5"
      />
    </svg>
  );
}

export default function DeliveryBanner() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 pb-4 sm:px-6 sm:pb-6 lg:px-10">
      <div className="relative flex min-h-28 flex-col items-start justify-between gap-5 overflow-hidden rounded-xl border border-white/[0.1] bg-[linear-gradient(105deg,#0D0D0D_0%,#0A1104_55%,#080A06_100%)] px-6 py-6 sm:flex-row sm:items-center sm:px-8 lg:min-h-32 lg:px-10">
        <BrazilMap />
        <div className="relative z-10 flex items-center gap-5">
          <Truck className="h-12 w-12 shrink-0 text-[#A9EC17] sm:h-14 sm:w-14" strokeWidth={1.4} />
          <div>
            <h2 className="font-display text-base font-bold uppercase text-white sm:text-xl">
              Entrega para todo o Brasil
            </h2>
            <p className="mt-1 text-[11px] text-white/50 sm:text-xs">
              Enviamos rápido, seguro e com código de rastreio.
            </p>
          </div>
        </div>
        <Link
          href="/#sobre"
          className="font-display relative z-10 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-[#A9EC17]/60 px-6 text-[10px] font-bold uppercase text-[#A9EC17] transition hover:border-[#A9EC17] hover:bg-[#A9EC17] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] sm:w-auto"
        >
          Saiba mais
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
