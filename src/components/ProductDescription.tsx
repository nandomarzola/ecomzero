import { ChevronDown } from "lucide-react";

type ProductDescriptionProps = {
  productName: string;
  subtitle: string;
  description: string;
};

type DescriptionSection = {
  title: string;
  paragraphs: string[];
  items: string[];
};

const sectionNames: Record<string, string> = {
  especificacoes: "Especificações",
  especificacao: "Especificações",
  idealpara: "Indicado para",
  indicadopara: "Indicado para",
  diferenciais: "Diferenciais",
  oquevemnacaixa: "Conteúdo da caixa",
  conteudodacaixa: "Conteúdo da caixa",
  caracteristicas: "Características",
};

const normalizeForComparison = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();

const cleanLine = (value: string) =>
  value
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/\s+/g, " ")
    .trim();

const isPromotionalHeading = (value: string) => {
  const letters = value.match(/\p{L}/gu) ?? [];
  if (letters.length < 10) return false;

  const uppercaseLetters = letters.filter(
    (letter) => letter === letter.toLocaleUpperCase("pt-BR"),
  );
  return uppercaseLetters.length / letters.length > 0.78;
};

const getSectionTitle = (value: string) => {
  const normalized = normalizeForComparison(value.replace(/:.*$/, ""));
  return sectionNames[normalized] ?? null;
};

const isSupportCallToAction = (value: string) =>
  /d[uú]vidas\?|chame no chat|responderemos r[aá]pido/i.test(value);

const truncateAtWord = (value: string, limit: number) => {
  if (value.length <= limit) return value;
  const truncated = value.slice(0, limit + 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > limit * 0.7 ? lastSpace : limit).trim()}…`;
};

export function shouldShowProductSubtitle(productName: string, subtitle: string) {
  const normalizedSubtitle = normalizeForComparison(subtitle);
  return Boolean(
    normalizedSubtitle && normalizedSubtitle !== normalizeForComparison(productName),
  );
}

export function parseProductDescription({
  productName,
  subtitle,
  description,
}: ProductDescriptionProps): DescriptionSection[] {
  const duplicateValues = new Set(
    [productName, subtitle]
      .map(normalizeForComparison)
      .filter(Boolean),
  );
  const rawLines = description
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: DescriptionSection[] = [];
  let current: DescriptionSection = {
    title: "Sobre o produto",
    paragraphs: [],
    items: [],
  };

  const commitCurrent = () => {
    if (current.paragraphs.length > 0 || current.items.length > 0) {
      sections.push(current);
    }
  };

  for (const rawLine of rawLines) {
    const line = cleanLine(rawLine);
    if (!line || duplicateValues.has(normalizeForComparison(line))) continue;
    if (isSupportCallToAction(line)) continue;

    const sectionTitle = getSectionTitle(line);
    if (sectionTitle) {
      commitCurrent();
      current = { title: sectionTitle, paragraphs: [], items: [] };
      continue;
    }

    if (current.title === "Sobre o produto" && isPromotionalHeading(line)) {
      continue;
    }

    if (/^[-–—•]/.test(rawLine.trim())) {
      current.items.push(line);
    } else {
      current.paragraphs.push(line);
    }
  }

  commitCurrent();

  if (sections.length === 0) {
    const fallback = cleanLine(description);
    return fallback
      ? [{ title: "Sobre o produto", paragraphs: [fallback], items: [] }]
      : [];
  }

  return sections;
}

export function getProductSummary(props: ProductDescriptionProps) {
  const sections = parseProductDescription(props);
  const preferredSection =
    sections.find((section) => section.title === "Sobre o produto") ?? sections[0];
  const summarySource =
    preferredSection?.paragraphs[0] ?? preferredSection?.items[0] ?? "";
  return truncateAtWord(summarySource, 320);
}

export default function ProductDescription(props: ProductDescriptionProps) {
  const sections = parseProductDescription(props);
  if (sections.length === 0) return null;

  return (
    <section className="mt-10 sm:mt-12" aria-labelledby="product-description-title">
      <details className="group overflow-hidden rounded-xl border border-white/[0.09] bg-[#0D0D0D]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
          <span>
            <span
              id="product-description-title"
              className="font-display block text-sm font-bold uppercase text-white"
            >
              Detalhes do produto
            </span>
            <span className="mt-1 block text-[11px] text-white/45">
              Descrição, especificações e conteúdo da embalagem.
            </span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-[#A9EC17] transition group-open:rotate-180">
            <ChevronDown className="h-4 w-4" />
          </span>
        </summary>

        <div className="grid gap-3 border-t border-white/[0.07] p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          {sections.map((section) => (
            <article
              key={section.title}
              className={`rounded-lg border border-white/[0.07] bg-[#111111] p-4 ${section.title === "Sobre o produto" ? "sm:col-span-2 lg:col-span-3" : ""}`}
            >
              <h3 className="font-display text-[11px] font-bold uppercase tracking-wide text-[#A9EC17]">
                {section.title}
              </h3>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-2 max-w-5xl text-[12px] leading-6 text-white/60 sm:text-[13px]"
                >
                  {paragraph}
                </p>
              ))}
              {section.items.length > 0 && (
                <ul className="mt-2 space-y-1.5 text-[12px] leading-5 text-white/58 sm:text-[13px]">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-[#A9EC17]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
