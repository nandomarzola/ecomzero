export type FooterLinkConfig = {
  id: string;
  label: string;
  href: string;
  ativo: boolean;
  novaAba: boolean;
};

export type FooterColumnConfig = {
  id: string;
  titulo: string;
  tipo: "links" | "categorias";
  ativo: boolean;
  links: FooterLinkConfig[];
};

export type BusinessHourConfig = {
  dia: string;
  label: string;
  ativo: boolean;
  inicio: string;
  fim: string;
};

export const DEFAULT_FOOTER_COLUMNS: FooterColumnConfig[] = [
  {
    id: "institucional",
    titulo: "Institucional",
    tipo: "links",
    ativo: true,
    links: [
      { id: "inicio", label: "Início", href: "/", ativo: true, novaAba: false },
      { id: "sobre", label: "Sobre a EcomZero", href: "/#sobre", ativo: true, novaAba: false },
      { id: "produtos", label: "Todos os produtos", href: "/produtos", ativo: true, novaAba: false },
    ],
  },
  {
    id: "categorias",
    titulo: "Categorias",
    tipo: "categorias",
    ativo: true,
    links: [],
  },
  {
    id: "ajuda",
    titulo: "Ajuda",
    tipo: "links",
    ativo: true,
    links: [
      { id: "carrinho", label: "Meu carrinho", href: "/carrinho", ativo: true, novaAba: false },
      { id: "como-comprar", label: "Como comprar", href: "/como-comprar", ativo: true, novaAba: false },
      { id: "entrega", label: "Entrega e segurança", href: "/#sobre", ativo: true, novaAba: false },
    ],
  },
];

export const DEFAULT_BUSINESS_HOURS: BusinessHourConfig[] = [
  { dia: "segunda", label: "Segunda-feira", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "terca", label: "Terça-feira", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "quarta", label: "Quarta-feira", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "quinta", label: "Quinta-feira", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "sexta", label: "Sexta-feira", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "sabado", label: "Sábado", ativo: false, inicio: "09:00", fim: "13:00" },
  { dia: "domingo", label: "Domingo", ativo: false, inicio: "09:00", fim: "13:00" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeFooterColumns(value: unknown): FooterColumnConfig[] {
  if (!Array.isArray(value)) return structuredClone(DEFAULT_FOOTER_COLUMNS);
  const columns = value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.titulo !== "string") return [];
    const tipo: FooterColumnConfig["tipo"] = entry.tipo === "categorias" ? "categorias" : "links";
    const links = Array.isArray(entry.links)
      ? entry.links.flatMap((link) => {
          if (!isRecord(link) || typeof link.id !== "string" || typeof link.label !== "string" || typeof link.href !== "string") return [];
          return [{
            id: link.id,
            label: link.label,
            href: link.href,
            ativo: link.ativo !== false,
            novaAba: link.novaAba === true,
          }];
        })
      : [];
    return [{ id: entry.id, titulo: entry.titulo, tipo, ativo: entry.ativo !== false, links }];
  });
  return columns.length ? columns : structuredClone(DEFAULT_FOOTER_COLUMNS);
}

export function normalizeBusinessHours(value: unknown): BusinessHourConfig[] {
  if (!Array.isArray(value)) return structuredClone(DEFAULT_BUSINESS_HOURS);
  const values = new Map(
    value.flatMap((entry) => isRecord(entry) && typeof entry.dia === "string" ? [[entry.dia, entry]] : []),
  );
  return DEFAULT_BUSINESS_HOURS.map((fallback) => {
    const entry = values.get(fallback.dia);
    if (!entry) return { ...fallback };
    return {
      ...fallback,
      ativo: entry.ativo === true,
      inicio: typeof entry.inicio === "string" ? entry.inicio : fallback.inicio,
      fim: typeof entry.fim === "string" ? entry.fim : fallback.fim,
    };
  });
}
