import { Leaf, ShieldCheck, Sparkles, ThumbsUp } from "lucide-react";

const features = [
  { title: "PRATICIDADE", subtitle: "NO DIA A DIA", icon: ShieldCheck },
  { title: "ECONOMIA", subtitle: "DE ENERGIA", icon: Leaf },
  { title: "SEGURANÇA", subtitle: "E CONFIANÇA", icon: Sparkles },
  { title: "QUALIDADE", subtitle: "QUE DURA", icon: ThumbsUp },
];

export default function FeatureBar() {
  return (
    <section className="mx-auto max-w-[1380px] px-4 sm:px-5 lg:px-8">
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[#6A1010] bg-[linear-gradient(90deg,#0B0202,#210505,#0B0202)] lg:grid-cols-4">
        {features.map(({ title, subtitle, icon: Icon }, index) => (
          <article
            key={title}
            className={`flex items-center justify-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 ${index === 1 ? "border-l border-[#511010] lg:border-l" : ""} ${index === 2 ? "border-t border-[#511010] lg:border-t-0 lg:border-l" : ""} ${index === 3 ? "border-l border-t border-[#511010] lg:border-t-0" : ""}`}
          >
            <Icon className="h-8 w-8 shrink-0 text-[#A9EC17] sm:h-10 sm:w-10" strokeWidth={1.8} />
            <p className="font-display text-[11px] font-bold leading-4 text-white sm:text-sm sm:leading-5">
              {title}
              <br />
              {subtitle}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
