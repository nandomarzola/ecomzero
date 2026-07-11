import { Leaf, ShieldCheck, Sparkles, ThumbsUp } from "lucide-react";

const features = [
  { title: "PRATICIDADE", subtitle: "NO DIA A DIA", icon: ShieldCheck },
  { title: "ECONOMIA", subtitle: "DE ENERGIA", icon: Leaf },
  { title: "SEGURANÇA", subtitle: "E CONFIANÇA", icon: Sparkles },
  { title: "QUALIDADE", subtitle: "QUE DURA", icon: ThumbsUp },
];

export default function FeatureBar() {
  return (
    <section className="mx-auto max-w-[1380px] px-5 lg:px-8">
      <div className="grid overflow-hidden rounded-xl border border-[#6A1010] bg-[linear-gradient(90deg,#0B0202,#210505,#0B0202)] sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ title, subtitle, icon: Icon }, index) => (
          <article
            key={title}
            className={`flex items-center justify-center gap-4 px-6 py-5 ${index > 0 ? "border-t border-[#511010] sm:border-t-0 sm:border-l" : ""}`}
          >
            <Icon className="h-10 w-10 shrink-0 text-[#A9EC17]" strokeWidth={1.8} />
            <p className="font-display text-sm font-bold leading-5 text-white">
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
