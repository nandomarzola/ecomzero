export type StoreFooterLink = {
  id: string;
  label: string;
  href: string;
  ativo: boolean;
  novaAba: boolean;
};

export type StoreFooterColumn = {
  id: string;
  titulo: string;
  tipo: "links" | "categorias";
  ativo: boolean;
  links: StoreFooterLink[];
};

export type StoreBusinessHour = {
  dia: string;
  label: string;
  ativo: boolean;
  inicio: string;
  fim: string;
};

const defaultBusinessHours: StoreBusinessHour[] = [
  { dia: "segunda", label: "Segunda-feira", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "terca", label: "Terça-feira", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "quarta", label: "Quarta-feira", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "quinta", label: "Quinta-feira", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "sexta", label: "Sexta-feira", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "sabado", label: "Sábado", ativo: false, inicio: "09:00", fim: "13:00" },
  { dia: "domingo", label: "Domingo", ativo: false, inicio: "09:00", fim: "13:00" },
];

const defaultColumns: StoreFooterColumn[] = [
  { id: "institucional", titulo: "Institucional", tipo: "links", ativo: true, links: [
    { id: "inicio", label: "Início", href: "/", ativo: true, novaAba: false },
    { id: "sobre", label: "Sobre a EcomZero", href: "/#sobre", ativo: true, novaAba: false },
    { id: "produtos", label: "Todos os produtos", href: "/produtos", ativo: true, novaAba: false },
  ] },
  { id: "categorias", titulo: "Categorias", tipo: "categorias", ativo: true, links: [] },
  { id: "ajuda", titulo: "Ajuda", tipo: "links", ativo: true, links: [
    { id: "carrinho", label: "Meu carrinho", href: "/carrinho", ativo: true, novaAba: false },
    { id: "como-comprar", label: "Como comprar", href: "/como-comprar", ativo: true, novaAba: false },
    { id: "entrega", label: "Entrega e segurança", href: "/#sobre", ativo: true, novaAba: false },
  ] },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function storeFooterColumns(value: unknown): StoreFooterColumn[] {
  if (!Array.isArray(value)) return defaultColumns;
  const columns = value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.titulo !== "string") return [];
    const tipo: StoreFooterColumn["tipo"] = entry.tipo === "categorias" ? "categorias" : "links";
    const links = Array.isArray(entry.links) ? entry.links.flatMap((link) => {
      if (!isRecord(link) || typeof link.id !== "string" || typeof link.label !== "string" || typeof link.href !== "string") return [];
      return [{ id: link.id, label: link.label, href: link.href, ativo: link.ativo !== false, novaAba: link.novaAba === true }];
    }) : [];
    return [{ id: entry.id, titulo: entry.titulo, tipo, ativo: entry.ativo !== false, links }];
  });
  return columns.length ? columns : defaultColumns;
}

export function storeBusinessHours(value: unknown): StoreBusinessHour[] {
  if (!Array.isArray(value)) return defaultBusinessHours;
  const configured = new Map(value.flatMap((entry) => isRecord(entry) && typeof entry.dia === "string" ? [[entry.dia, entry]] : []));
  return defaultBusinessHours.map((fallback) => {
    const entry = configured.get(fallback.dia);
    return entry ? {
      ...fallback,
      ativo: entry.ativo === true,
      inicio: typeof entry.inicio === "string" ? entry.inicio : fallback.inicio,
      fim: typeof entry.fim === "string" ? entry.fim : fallback.fim,
    } : fallback;
  });
}

export function whatsappUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}

export function renderCustomerMessage(template: string, data: { customerName: string; orderId?: string }) {
  return template
    .replaceAll("{nome_cliente}", data.customerName)
    .replaceAll(
      "{numero_pedido}",
      data.orderId ? `#${data.orderId.slice(0, 8)}` : "",
    );
}
