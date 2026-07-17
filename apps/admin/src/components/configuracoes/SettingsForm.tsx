/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BadgePercent,
  CheckCircle2,
  Clock3,
  Code2,
  ExternalLink,
  Globe2,
  GripVertical,
  Headphones,
  Image as ImageIcon,
  LayoutGrid,
  Languages,
  Loader2,
  Megaphone,
  MessageSquare,
  Monitor,
  MonitorSmartphone,
  MousePointerClick,
  Palette,
  PanelBottom,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Share2,
  ShieldCheck,
  Star,
  Store,
  Ticket,
  Trash2,
  Type,
  Upload,
  UserRoundCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { saveSettingsAction } from "@/lib/actions/settings";
import {
  BRAZIL_UFS,
  REGIONS,
  UF_LABEL,
  isBrazilUf,
  type BrazilUf,
} from "@/lib/brazilStates";

export type SettingsFormInitial = {
  nomeLoja: string;
  descricaoFooter: string;
  mensagemFooter: string;
  barraAnuncioAtiva: boolean;
  barraAnuncioTexto: string | null;
  barraAnuncioLink: string | null;
  barraAnuncioCor: string | null;
  barraAnuncioVelocidade: number;
  announcementItems: Array<{
    id: string;
    texto: string;
    link: string | null;
    ordem: number;
    ativo: boolean;
    regioesElegiveis: string[];
  }>;
  emailSuporte: string | null;
  telefoneSuporte: string | null;
  whatsapp: string | null;
  linkShopee: string | null;
  linkInstagram: string | null;
  linkFacebook: string | null;
  linkTiktok: string | null;
  logoUrl: string;
  faviconUrl: string | null;
  corPrincipal: string;
  fusoHorario: string;
  lojaAtiva: boolean;
  plano: string;
  moeda: string;
  idioma: string;
  fontFamily: "geist" | "inter" | "poppins" | "roboto";
  productCardStyle: "standard" | "compact" | "discount";
  cardCornerStyle: "straight" | "rounded";
  showRating: boolean;
  showBuyNowButton: boolean;
  buttonStyle: "filled" | "outline" | "pill";
  updatedAt: string;
};

type AnnouncementFormItem = Omit<SettingsFormInitial["announcementItems"][number], "link"> & { link: string };

type FormState = Omit<SettingsFormInitial, "updatedAt" | "barraAnuncioTexto" | "barraAnuncioLink" | "barraAnuncioCor" | "announcementItems" | "emailSuporte" | "telefoneSuporte" | "whatsapp" | "linkShopee" | "linkInstagram" | "linkFacebook" | "linkTiktok" | "faviconUrl"> & {
  barraAnuncioTexto: string;
  barraAnuncioLink: string;
  barraAnuncioCor: string;
  announcementItems: AnnouncementFormItem[];
  emailSuporte: string;
  telefoneSuporte: string;
  whatsapp: string;
  linkShopee: string;
  linkInstagram: string;
  linkFacebook: string;
  linkTiktok: string;
  faviconUrl: string;
};

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const navigation: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Geral",
    items: [
      { id: "identidade", label: "Identidade da loja", icon: ImageIcon },
      { id: "aparencia", label: "Aparência", icon: Palette },
      { id: "anuncio", label: "Barra de anúncio", icon: Megaphone },
      { id: "rodape", label: "Rodapé", icon: PanelBottom },
    ],
  },
  {
    label: "Atendimento",
    items: [
      { id: "canais-atendimento", label: "Canais de atendimento", icon: Headphones },
      { id: "horarios", label: "Horários de atendimento", icon: Clock3 },
    ],
  },
  {
    label: "Canais e redes",
    items: [
      { id: "redes", label: "Redes sociais", icon: Share2 },
      { id: "marketplaces", label: "Marketplaces", icon: Store },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "mensagens", label: "Mensagens", icon: MessageSquare },
      { id: "cupons", label: "Cupons padrão", icon: Ticket },
      { id: "pixel", label: "Pixel e códigos", icon: Code2 },
    ],
  },
  {
    label: "Loja",
    items: [
      { id: "geral", label: "Geral", icon: Settings2 },
      { id: "moeda", label: "Moeda e idioma", icon: Languages },
      { id: "dominio", label: "Domínio", icon: Globe2 },
    ],
  },
  {
    label: "Segurança",
    items: [
      { id: "usuarios", label: "Usuários", icon: Users },
      { id: "sessoes", label: "Sessões", icon: MonitorSmartphone },
      { id: "seguranca", label: "Segurança", icon: ShieldCheck },
    ],
  },
];

const inputClass = "h-10 rounded-md border border-white/[0.09] bg-[#090909] px-3 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-[#A9EC17]/45";

const fontOptions = [
  { value: "geist", label: "Geist + Montserrat (atual)" },
  { value: "inter", label: "Inter" },
  { value: "poppins", label: "Poppins" },
  { value: "roboto", label: "Roboto" },
] as const;

const cardStyleOptions = [
  { value: "standard", label: "Padrão", description: "Informações completas e duas ações." },
  { value: "compact", label: "Compacto", description: "Menos altura para mostrar mais produtos." },
  { value: "discount", label: "Destaque de desconto", description: "Realça ofertas e percentual economizado." },
] as const;

const cornerOptions = [
  { value: "straight", label: "Retos" },
  { value: "rounded", label: "Arredondados" },
] as const;

const buttonStyleOptions = [
  { value: "filled", label: "Preenchido" },
  { value: "outline", label: "Contornado" },
  { value: "pill", label: "Pill" },
] as const;

function previewFontFamily(font: FormState["fontFamily"]) {
  const families: Record<FormState["fontFamily"], string> = {
    geist: "var(--font-geist), Arial, sans-serif",
    inter: "var(--font-inter), Arial, sans-serif",
    poppins: "var(--font-poppins), Arial, sans-serif",
    roboto: "var(--font-roboto), Arial, sans-serif",
  };
  return families[font];
}

function contrastText(hexColor: string) {
  const hex = hexColor.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 150 ? "#050505" : "#FFFFFF";
}

function normalize(initial: SettingsFormInitial): FormState {
  const { updatedAt: _updatedAt, ...values } = initial;
  return {
    ...values,
    barraAnuncioTexto: initial.barraAnuncioTexto ?? "",
    barraAnuncioLink: initial.barraAnuncioLink ?? "",
    barraAnuncioCor: initial.barraAnuncioCor ?? "",
    announcementItems: [...initial.announcementItems]
      .sort((first, second) => first.ordem - second.ordem)
      .map((item, index) => ({
        ...item,
        link: item.link ?? "",
        ordem: index,
        regioesElegiveis: item.regioesElegiveis.filter(isBrazilUf),
      })),
    emailSuporte: initial.emailSuporte ?? "",
    telefoneSuporte: initial.telefoneSuporte ?? "",
    whatsapp: initial.whatsapp ?? "",
    linkShopee: initial.linkShopee ?? "",
    linkInstagram: initial.linkInstagram ?? "",
    linkFacebook: initial.linkFacebook ?? "",
    linkTiktok: initial.linkTiktok ?? "",
    faviconUrl: initial.faviconUrl ?? "",
  };
}

function resolveAsset(url: string, storefrontUrl: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, `${storefrontUrl.replace(/\/$/, "")}/`).toString();
}

function timezoneLabel(timezone: string) {
  const labels: Record<string, string> = {
    "America/Sao_Paulo": "(GMT-03:00) Brasília, São Paulo",
    "America/Manaus": "(GMT-04:00) Manaus",
    "America/Cuiaba": "(GMT-04:00) Cuiabá",
    "America/Rio_Branco": "(GMT-05:00) Rio Branco",
    UTC: "(GMT+00:00) UTC",
  };
  return labels[timezone] ?? timezone;
}

function HighlightedDescription({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(produtos|inteligentes|úteis|qualidade|rotina)/gi);
  return (
    <>
      {parts.map((part, index) =>
        /^(produtos|inteligentes|úteis|qualidade|rotina)$/i.test(part)
          ? <strong key={`${part}-${index}`} style={{ color }}>{part}</strong>
          : <span key={`${part}-${index}`}>{part}</span>,
      )}
    </>
  );
}

function SortableAnnouncementItem({
  item,
  onChange,
  onRemove,
}: {
  item: AnnouncementFormItem;
  onChange: (patch: Partial<AnnouncementFormItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const selectedUfs = item.regioesElegiveis.filter(isBrazilUf);
  const selectedSet = new Set(selectedUfs);
  const audienceLabel = selectedUfs.length === 0
    ? "Todo o Brasil"
    : `${selectedUfs.length} ${selectedUfs.length === 1 ? "estado selecionado" : "estados selecionados"}`;

  const setEligibleRegions = (ufs: readonly BrazilUf[]) => {
    onChange({ regioesElegiveis: ufs.length === BRAZIL_UFS.length ? [] : [...ufs] });
  };

  const toggleUf = (uf: BrazilUf) => {
    const next = selectedSet.has(uf)
      ? selectedUfs.filter((selected) => selected !== uf)
      : BRAZIL_UFS.filter((candidate) => selectedSet.has(candidate) || candidate === uf);
    setEligibleRegions(next);
  };

  const isExactPreset = (ufs: readonly BrazilUf[]) =>
    selectedUfs.length === ufs.length &&
    ufs.every((uf) => selectedSet.has(uf));

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`rounded-md border bg-[#090909] p-3 transition ${isDragging ? "border-[#A9EC17]/55 shadow-2xl shadow-black" : "border-white/[0.08]"}`}
    >
      <div className="flex items-start gap-3">
        <button type="button" aria-label="Reordenar mensagem" title="Arraste para reordenar" className="mt-1 flex h-8 w-7 shrink-0 touch-none cursor-grab items-center justify-center rounded text-white/30 transition hover:bg-white/[0.04] hover:text-white active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          <label className="flex flex-col gap-1.5 text-[10px] text-white/55">
            Mensagem
            <input required maxLength={80} value={item.texto} onChange={(event) => onChange({ texto: event.target.value })} placeholder="Ex: Frete grátis acima de R$ 99,00" className={inputClass} />
            <span className="self-end text-[9px] text-white/25">{item.texto.length}/80</span>
          </label>
          <label className="flex flex-col gap-1.5 text-[10px] text-white/55">
            Link opcional
            <input value={item.link} onChange={(event) => onChange({ link: event.target.value })} placeholder="/ofertas ou https://..." className={inputClass} />
          </label>
          <div className="rounded-md border border-white/[0.07] bg-black/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold text-white/65">Público por região</p>
                <p className="mt-1 text-[9px] leading-4 text-white/30">
                  {audienceLabel}. Sem seleção, a mensagem aparece para todos.
                </p>
              </div>
              <Globe2 className="h-4 w-4 text-[#A9EC17]/70" strokeWidth={1.6} />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setEligibleRegions([])}
                aria-pressed={selectedUfs.length === 0}
                className={`rounded-md border px-2.5 py-1.5 text-[8px] font-semibold transition ${
                  selectedUfs.length === 0
                    ? "border-[#A9EC17]/50 bg-[#A9EC17]/10 text-[#A9EC17]"
                    : "border-white/[0.08] bg-[#090909] text-white/40 hover:border-white/15 hover:text-white/65"
                }`}
              >
                Todo o Brasil
              </button>
              {REGIONS.map((region) => (
                <button
                  key={region.nome}
                  type="button"
                  onClick={() => setEligibleRegions(region.ufs)}
                  aria-pressed={isExactPreset(region.ufs)}
                  className={`rounded-md border px-2.5 py-1.5 text-[8px] font-semibold transition ${
                    isExactPreset(region.ufs)
                      ? "border-[#A9EC17]/50 bg-[#A9EC17]/10 text-[#A9EC17]"
                      : "border-white/[0.08] bg-[#090909] text-white/40 hover:border-white/15 hover:text-white/65"
                  }`}
                >
                  {region.nome}
                </button>
              ))}
            </div>

            <details className="group/ufs mt-3 border-t border-white/[0.06] pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[9px] font-semibold text-white/45 transition hover:text-white/70 [&::-webkit-details-marker]:hidden">
                Personalizar por estado
                <span className="text-[8px] text-white/25 transition group-open/ufs:rotate-180">⌄</span>
              </summary>
              <div className="mt-3 space-y-3">
                {REGIONS.map((region) => (
                  <div key={region.nome}>
                    <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white/25">
                      {region.nome}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {region.ufs.map((uf) => (
                        <button
                          key={uf}
                          type="button"
                          onClick={() => toggleUf(uf)}
                          aria-pressed={selectedSet.has(uf)}
                          title={UF_LABEL[uf]}
                          className={`min-w-9 rounded border px-2 py-1.5 text-[8px] font-bold transition ${
                            selectedSet.has(uf)
                              ? "border-[#A9EC17]/45 bg-[#A9EC17]/10 text-[#A9EC17]"
                              : "border-white/[0.08] bg-[#080808] text-white/35 hover:border-white/15 hover:text-white/60"
                          }`}
                        >
                          {uf}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
            <div className="flex items-center gap-2">
              <button type="button" role="switch" aria-checked={item.ativo} onClick={() => onChange({ ativo: !item.ativo })} className={`relative h-5 w-9 shrink-0 rounded-full transition ${item.ativo ? "bg-[#A9EC17]" : "bg-white/15"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-black transition ${item.ativo ? "left-[18px]" : "left-0.5"}`} /></button>
              <span className="text-[9px] text-white/40">{item.ativo ? "Mensagem ativa" : "Mensagem oculta"}</span>
            </div>
            <button type="button" onClick={onRemove} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[9px] font-semibold text-red-300/75 transition hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /> Remover</button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SettingsForm({
  initial,
  storefrontUrl,
}: {
  initial: SettingsFormInitial;
  storefrontUrl: string;
}) {
  const initialState = useMemo(() => normalize(initial), [initial]);
  const [savedForm, setSavedForm] = useState<FormState>(initialState);
  const [form, setForm] = useState<FormState>(initialState);
  const [activeSection, setActiveSection] = useState("identidade");
  const [lastUpdated, setLastUpdated] = useState(initial.updatedAt);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [previewAnnouncementIndex, setPreviewAnnouncementIndex] = useState(0);
  const logoInput = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);
  const announcementSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const validColor = /^#[0-9a-fA-F]{6}$/.test(form.corPrincipal);
  const previewColor = validColor ? form.corPrincipal : savedForm.corPrincipal;
  const logoPreview = resolveAsset(form.logoUrl, storefrontUrl);
  const faviconPreview = resolveAsset(form.faviconUrl || form.logoUrl, storefrontUrl);
  const appearancePreviewFont = previewFontFamily(form.fontFamily);
  const appearanceCardRadius = form.cardCornerStyle === "rounded" ? "14px" : "3px";
  const appearanceButtonStyle = {
    borderRadius: form.buttonStyle === "pill" ? "9999px" : "7px",
    border: `1px solid ${previewColor}`,
    backgroundColor: form.buttonStyle === "outline" ? "transparent" : previewColor,
    color: form.buttonStyle === "outline" ? previewColor : "#050505",
  };
  const previewAnnouncements = form.announcementItems.filter((item) => item.ativo && item.texto.trim());
  const currentPreviewAnnouncement = previewAnnouncements.length
    ? previewAnnouncements[previewAnnouncementIndex % previewAnnouncements.length]
    : null;
  const validAnnouncementColor = /^#[0-9a-fA-F]{6}$/.test(form.barraAnuncioCor);
  const announcementPreviewColor = validAnnouncementColor ? form.barraAnuncioCor : previewColor;
  const activeItem = navigation.flatMap((group) => group.items).find((item) => item.id === activeSection);

  useEffect(() => {
    if (!form.barraAnuncioAtiva || previewAnnouncements.length <= 1) return;
    const interval = window.setInterval(
      () => setPreviewAnnouncementIndex((current) => current + 1),
      form.barraAnuncioVelocidade * 1000,
    );
    return () => window.clearInterval(interval);
  }, [form.barraAnuncioAtiva, form.barraAnuncioVelocidade, previewAnnouncements.length]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function updateAnnouncementItem(id: string, patch: Partial<AnnouncementFormItem>) {
    setForm((current) => ({
      ...current,
      announcementItems: current.announcementItems.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
    setError(null);
  }

  function addAnnouncementItem() {
    if (form.announcementItems.length >= 10) return;
    setForm((current) => ({
      ...current,
      announcementItems: [
        ...current.announcementItems,
        { id: crypto.randomUUID(), texto: "", link: "", ordem: current.announcementItems.length, ativo: true, regioesElegiveis: [] },
      ],
    }));
    setError(null);
  }

  function toggleAnnouncementBar() {
    setForm((current) => ({
      ...current,
      barraAnuncioAtiva: !current.barraAnuncioAtiva,
      announcementItems: !current.barraAnuncioAtiva && current.announcementItems.length === 0
        ? [{ id: crypto.randomUUID(), texto: "", link: "", ordem: 0, ativo: true, regioesElegiveis: [] }]
        : current.announcementItems,
    }));
    setError(null);
  }

  function removeAnnouncementItem(id: string) {
    setForm((current) => ({
      ...current,
      announcementItems: current.announcementItems
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, ordem: index })),
    }));
    setError(null);
  }

  function reorderAnnouncementItems(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    setForm((current) => {
      const oldIndex = current.announcementItems.findIndex((item) => item.id === event.active.id);
      const newIndex = current.announcementItems.findIndex((item) => item.id === event.over?.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return {
        ...current,
        announcementItems: arrayMove(current.announcementItems, oldIndex, newIndex).map((item, index) => ({ ...item, ordem: index })),
      };
    });
    setError(null);
  }

  async function uploadAsset(kind: "logo" | "favicon", file?: File) {
    if (!file) return;
    const logoTypes = ["image/png", "image/jpeg"];
    const faviconTypes = ["image/png", "image/x-icon", "image/vnd.microsoft.icon"];
    const allowed = kind === "logo" ? logoTypes : faviconTypes;
    if (!allowed.includes(file.type) && !(kind === "favicon" && file.name.toLowerCase().endsWith(".ico"))) {
      setError(kind === "logo" ? "Use uma imagem PNG ou JPG para a logo." : "Use um arquivo PNG ou ICO para o favicon.");
      return;
    }
    setUploading(kind);
    setError(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/upload?scope=branding", { method: "POST", body: data });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Falha no upload.");
      set(kind === "logo" ? "logoUrl" : "faviconUrl", result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no upload.");
    } finally {
      setUploading(null);
      if (kind === "logo" && logoInput.current) logoInput.current.value = "";
      if (kind === "favicon" && faviconInput.current) faviconInput.current.value = "";
    }
  }

  function cancelChanges() {
    setForm(savedForm);
    setError(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await saveSettingsAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedForm(form);
      setLastUpdated(result.updatedAt);
    });
  }

  const updatedAt = new Date(lastUpdated).toLocaleString("pt-BR", {
    timeZone: form.fusoHorario === "UTC" ? "UTC" : form.fusoHorario,
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <p className="text-[11px] text-white/50">Gerencie as informações e preferências da sua loja.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={cancelChanges} disabled={!dirty || pending} className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] px-3 text-[10px] font-semibold text-white/65 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
            <RotateCcw className="h-3.5 w-3.5" /> Cancelar alterações
          </button>
          <button type="submit" disabled={!dirty || pending || uploading !== null} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#A9EC17] px-4 text-[10px] font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar alterações
          </button>
          <span className={`inline-flex items-center gap-2 px-1 text-[10px] ${dirty ? "text-amber-300" : "text-[#A9EC17]"}`}>
            {dirty ? <span className="h-2 w-2 rounded-full bg-amber-300" /> : <CheckCircle2 className="h-4 w-4" />}
            {dirty ? "Alterações não salvas" : "Todas as alterações foram salvas"}
          </span>
        </div>
      </header>

      {error ? <p role="alert" className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[190px_minmax(0,1fr)_340px]">
        <nav aria-label="Seções das configurações" className="overflow-x-auto rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] xl:sticky xl:top-[74px] xl:max-h-[calc(100vh-94px)] xl:overflow-y-auto">
          <div className="flex min-w-max gap-2 p-2 xl:block xl:min-w-0 xl:space-y-0">
            {navigation.map((group) => (
              <section key={group.label} className="xl:border-b xl:border-white/[0.06] xl:p-2 xl:last:border-b-0">
                <h2 className="hidden px-2 pb-1 pt-1 text-[8px] font-bold uppercase tracking-[0.09em] text-white/35 xl:block">{group.label}</h2>
                <div className="flex gap-1 xl:block xl:space-y-0.5">
                  {group.items.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" onClick={() => setActiveSection(id)} className={`flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-left text-[10px] transition xl:w-full ${activeSection === id ? "bg-[#A9EC17]/10 font-semibold text-[#A9EC17]" : "text-white/55 hover:bg-white/[0.035] hover:text-white"}`}>
                      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <main className="min-w-0 rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] p-4 sm:p-5">
          {activeSection === "identidade" ? (
            <div className="space-y-5">
              <header>
                <h2 className="font-display text-[15px] font-bold text-white">Identidade da loja</h2>
                <p className="mt-1 text-[10px] text-white/38">Informações básicas que representam a sua marca.</p>
              </header>

              <section className="space-y-4 rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-[10px] text-white/55">
                    Nome da loja <span className="text-red-300">*</span>
                    <input required minLength={2} maxLength={60} value={form.nomeLoja} onChange={(event) => set("nomeLoja", event.target.value)} className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[10px] text-white/55">
                    Mensagem curta do rodapé
                    <input required minLength={5} maxLength={160} value={form.mensagemFooter} onChange={(event) => set("mensagemFooter", event.target.value)} className={inputClass} />
                    <span className="text-[9px] text-white/30">Aparece no rodapé da loja.</span>
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-[10px] text-white/55">
                  Descrição institucional
                  <textarea required minLength={10} maxLength={160} value={form.descricaoFooter} onChange={(event) => set("descricaoFooter", event.target.value)} className={`${inputClass} min-h-24 resize-y py-3`} />
                  <span className="flex justify-between gap-4 text-[9px] text-white/30"><span>Aparece em “Sobre a loja” e páginas institucionais.</span><span>{form.descricaoFooter.length}/160</span></span>
                </label>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
                  <h3 className="text-[10px] font-semibold text-white/65">Logo da loja</h3>
                  <p className="mt-1 text-[9px] text-white/30">Aparece no cabeçalho e no rodapé.</p>
                  <div className="mt-3 grid grid-cols-[104px_minmax(0,1fr)] gap-3">
                    <div className="flex h-[104px] items-center justify-center overflow-hidden rounded-md border border-white/[0.08] bg-black p-3">
                      {logoPreview ? <img src={logoPreview} alt="Logo atual da loja" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-white/20" />}
                    </div>
                    <button type="button" onClick={() => logoInput.current?.click()} disabled={uploading !== null} className="flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/[0.14] text-[10px] text-white/50 transition hover:border-[#A9EC17]/35 hover:text-white disabled:opacity-50">
                      {uploading === "logo" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                      {uploading === "logo" ? "Enviando..." : "Alterar logo"}
                      <span className="text-[8px] text-white/25">PNG ou JPG · 512×512px</span>
                    </button>
                  </div>
                  <input ref={logoInput} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => uploadAsset("logo", event.target.files?.[0])} />
                </div>

                <div className="rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
                  <h3 className="text-[10px] font-semibold text-white/65">Favicon</h3>
                  <p className="mt-1 text-[9px] text-white/30">Ícone exibido na aba do navegador.</p>
                  <div className="mt-3 grid grid-cols-[104px_minmax(0,1fr)] gap-3">
                    <div className="flex h-[104px] items-center justify-center overflow-hidden rounded-md border border-white/[0.08] bg-black p-7">
                      {faviconPreview ? <img src={faviconPreview} alt="Favicon atual" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-white/20" />}
                    </div>
                    <button type="button" onClick={() => faviconInput.current?.click()} disabled={uploading !== null} className="flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/[0.14] text-[10px] text-white/50 transition hover:border-[#A9EC17]/35 hover:text-white disabled:opacity-50">
                      {uploading === "favicon" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                      {uploading === "favicon" ? "Enviando..." : "Alterar favicon"}
                      <span className="text-[8px] text-white/25">PNG ou ICO · 32×32px</span>
                    </button>
                  </div>
                  <input ref={faviconInput} hidden type="file" accept="image/png,image/x-icon,.ico" onChange={(event) => uploadAsset("favicon", event.target.files?.[0])} />
                </div>
              </section>

              <section className="grid gap-4 rounded-md border border-white/[0.07] bg-black/[0.08] p-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-[10px] text-white/55">
                  Cor principal da loja
                  <span className="flex h-10 overflow-hidden rounded-md border border-white/[0.09] bg-[#090909] focus-within:border-[#A9EC17]/45">
                    <input type="color" value={previewColor} onChange={(event) => set("corPrincipal", event.target.value.toUpperCase())} className="h-10 w-12 cursor-pointer border-0 bg-transparent p-1" />
                    <input required pattern="#[0-9a-fA-F]{6}" value={form.corPrincipal} onChange={(event) => set("corPrincipal", event.target.value.toUpperCase())} className="min-w-0 flex-1 bg-transparent px-3 text-xs text-white outline-none" />
                  </span>
                  <span className="text-[9px] text-white/30">Usada em botões, destaques e elementos interativos.</span>
                </label>
                <label className="flex flex-col gap-1.5 text-[10px] text-white/55">
                  Fuso horário
                  <select value={form.fusoHorario} onChange={(event) => set("fusoHorario", event.target.value)} className={inputClass}>
                    <option value="America/Sao_Paulo">(GMT-03:00) Brasília, São Paulo</option>
                    <option value="America/Manaus">(GMT-04:00) Manaus</option>
                    <option value="America/Cuiaba">(GMT-04:00) Cuiabá</option>
                    <option value="America/Rio_Branco">(GMT-05:00) Rio Branco</option>
                    <option value="UTC">(GMT+00:00) UTC</option>
                  </select>
                </label>
              </section>
            </div>
          ) : activeSection === "aparencia" ? (
            <div className="space-y-5">
              <header>
                <h2 className="font-display text-[15px] font-bold text-white">Aparência</h2>
                <p className="mt-1 text-[10px] text-white/38">Personalize tipografia, cards e botões da loja.</p>
              </header>

              <section className="rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-white/45"><Monitor className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <label className="flex flex-col gap-1.5 text-[10px] text-white/55">
                      Tema visual
                      <select disabled value="dark" className={`${inputClass} cursor-not-allowed opacity-55`}>
                        <option value="dark">Escuro — tema atual</option>
                      </select>
                    </label>
                    <p className="mt-2 text-[9px] leading-4 text-white/30">Tema claro e automático exigem a próxima fase de tokens visuais do storefront.</p>
                  </div>
                </div>
              </section>

              <section className="rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#A9EC17]/10 text-[#A9EC17]"><Type className="h-4 w-4" /></span>
                  <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-[10px] text-white/55">
                    Fonte principal da loja
                    <select value={form.fontFamily} onChange={(event) => set("fontFamily", event.target.value as FormState["fontFamily"])} className={inputClass}>
                      {fontOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <span className="text-[9px] text-white/30">Aplicada a textos, títulos e elementos de destaque da loja.</span>
                  </label>
                </div>
              </section>

              <section className="space-y-4 rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-400/10 text-sky-300"><LayoutGrid className="h-4 w-4" /></span>
                  <div><h3 className="text-[10px] font-semibold text-white/70">Cards de produto</h3><p className="mt-0.5 text-[9px] text-white/30">Defina densidade, cantos e informações visíveis.</p></div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] text-white/55">Formato do card</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {cardStyleOptions.map((option) => (
                      <button key={option.value} type="button" onClick={() => set("productCardStyle", option.value)} className={`min-h-24 rounded-md border p-3 text-left transition ${form.productCardStyle === option.value ? "border-[#A9EC17]/50 bg-[#A9EC17]/[0.07]" : "border-white/[0.08] bg-[#090909] hover:border-white/15"}`}>
                        <span className={`block text-[10px] font-semibold ${form.productCardStyle === option.value ? "text-[#A9EC17]" : "text-white/65"}`}>{option.label}</span>
                        <span className="mt-2 block text-[9px] leading-4 text-white/30">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] text-white/55">Cantos do card</p>
                  <div className="grid grid-cols-2 gap-2">
                    {cornerOptions.map((option) => (
                      <button key={option.value} type="button" onClick={() => set("cardCornerStyle", option.value)} className={`h-10 border text-[10px] font-semibold transition ${option.value === "rounded" ? "rounded-xl" : "rounded-sm"} ${form.cardCornerStyle === option.value ? "border-[#A9EC17]/50 bg-[#A9EC17]/[0.07] text-[#A9EC17]" : "border-white/[0.08] bg-[#090909] text-white/55 hover:border-white/15"}`}>{option.label}</button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-white/[0.06] rounded-md border border-white/[0.07] bg-[#090909] px-3">
                  <div className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-2.5"><Star className="h-4 w-4 text-amber-300" /><div><p className="text-[10px] font-medium text-white/65">Mostrar avaliação</p><p className="mt-0.5 text-[9px] text-white/28">Exibe estrelas quando houver avaliações.</p></div></div>
                    <button type="button" role="switch" aria-checked={form.showRating} onClick={() => set("showRating", !form.showRating)} className={`relative h-5 w-9 shrink-0 rounded-full transition ${form.showRating ? "bg-[#A9EC17]" : "bg-white/15"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-black transition ${form.showRating ? "left-[18px]" : "left-0.5"}`} /></button>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-2.5"><BadgePercent className="h-4 w-4 text-[#A9EC17]" /><div><p className="text-[10px] font-medium text-white/65">Mostrar “Comprar agora”</p><p className="mt-0.5 text-[9px] text-white/28">Mantém também “Adicionar ao carrinho”.</p></div></div>
                    <button type="button" role="switch" aria-checked={form.showBuyNowButton} onClick={() => set("showBuyNowButton", !form.showBuyNowButton)} className={`relative h-5 w-9 shrink-0 rounded-full transition ${form.showBuyNowButton ? "bg-[#A9EC17]" : "bg-white/15"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-black transition ${form.showBuyNowButton ? "left-[18px]" : "left-0.5"}`} /></button>
                  </div>
                </div>
              </section>

              <section className="rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-400/10 text-violet-300"><MousePointerClick className="h-4 w-4" /></span>
                  <div><h3 className="text-[10px] font-semibold text-white/70">Botão principal</h3><p className="mt-0.5 text-[9px] text-white/30">Aplicado aos CTAs principais pertencentes à loja.</p></div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {buttonStyleOptions.map((option) => (
                    <button key={option.value} type="button" onClick={() => set("buttonStyle", option.value)} className={`h-11 border text-[10px] font-semibold transition ${option.value === "pill" ? "rounded-full" : "rounded-md"} ${form.buttonStyle === option.value ? "border-[#A9EC17]/50 bg-[#A9EC17]/[0.07] text-[#A9EC17]" : "border-white/[0.08] bg-[#090909] text-white/55 hover:border-white/15"}`}>{option.label}</button>
                  ))}
                </div>
              </section>
            </div>
          ) : activeSection === "anuncio" ? (
            <div className="space-y-5">
              <header>
                <h2 className="font-display text-[15px] font-bold text-white">Barra de anúncio</h2>
                <p className="mt-1 text-[10px] text-white/38">Configure mensagens rotativas exibidas acima do cabeçalho da loja.</p>
              </header>

              <section className="flex items-center justify-between gap-4 rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#A9EC17]/10 text-[#A9EC17]"><Megaphone className="h-4 w-4" /></span>
                  <div><h3 className="text-[10px] font-semibold text-white/70">Exibir barra de anúncio</h3><p className="mt-1 text-[9px] text-white/30">Quando desativada, a faixa some completamente da loja.</p></div>
                </div>
                <button type="button" role="switch" aria-checked={form.barraAnuncioAtiva} onClick={toggleAnnouncementBar} className={`relative h-6 w-11 shrink-0 rounded-full transition ${form.barraAnuncioAtiva ? "bg-[#A9EC17]" : "bg-white/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition ${form.barraAnuncioAtiva ? "left-5" : "left-0.5"}`} /></button>
              </section>

              <section className="space-y-4 rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-[10px] font-semibold text-white/70">Mensagens</h3><p className="mt-1 text-[9px] text-white/30">Arraste para definir a ordem de rotação. Máximo de 10 mensagens.</p></div>
                  <button type="button" onClick={addAnnouncementItem} disabled={form.announcementItems.length >= 10} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#A9EC17] px-3 text-[9px] font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Adicionar mensagem</button>
                </div>

                {form.announcementItems.length ? (
                  <DndContext sensors={announcementSensors} collisionDetection={closestCenter} onDragEnd={reorderAnnouncementItems}>
                    <SortableContext items={form.announcementItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {form.announcementItems.map((item) => (
                          <SortableAnnouncementItem key={item.id} item={item} onChange={(patch) => updateAnnouncementItem(item.id, patch)} onRemove={() => removeAnnouncementItem(item.id)} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="rounded-md border border-dashed border-white/[0.1] bg-[#090909] px-5 py-10 text-center"><Megaphone className="mx-auto h-7 w-7 text-white/20" /><p className="mt-3 text-[10px] font-semibold text-white/50">Nenhuma mensagem cadastrada</p><p className="mt-1 text-[9px] text-white/25">Adicione a primeira mensagem para configurar a rotação.</p></div>
                )}
              </section>

              <section className="grid gap-4 rounded-md border border-white/[0.07] bg-black/[0.08] p-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-[10px] font-semibold text-white/70">Cor de fundo</h3>
                  <p className="mt-1 text-[9px] text-white/30">Use a identidade da loja ou uma cor específica para campanhas.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => set("barraAnuncioCor", "")} className={`h-10 rounded-md border text-[9px] font-semibold transition ${!form.barraAnuncioCor ? "border-[#A9EC17]/50 bg-[#A9EC17]/[0.07] text-[#A9EC17]" : "border-white/[0.08] bg-[#090909] text-white/45"}`}>Cor principal</button>
                    <button type="button" onClick={() => set("barraAnuncioCor", validColor ? form.corPrincipal : savedForm.corPrincipal)} className={`h-10 rounded-md border text-[9px] font-semibold transition ${form.barraAnuncioCor ? "border-[#A9EC17]/50 bg-[#A9EC17]/[0.07] text-[#A9EC17]" : "border-white/[0.08] bg-[#090909] text-white/45"}`}>Personalizada</button>
                  </div>
                  {form.barraAnuncioCor ? (
                    <span className="mt-3 flex h-10 overflow-hidden rounded-md border border-white/[0.09] bg-[#090909]">
                      <input type="color" value={announcementPreviewColor} onChange={(event) => set("barraAnuncioCor", event.target.value.toUpperCase())} className="h-10 w-12 cursor-pointer border-0 bg-transparent p-1" />
                      <input required pattern="#[0-9a-fA-F]{6}" value={form.barraAnuncioCor} onChange={(event) => set("barraAnuncioCor", event.target.value.toUpperCase())} className="min-w-0 flex-1 bg-transparent px-3 text-xs text-white outline-none" />
                    </span>
                  ) : null}
                </div>

                <label className="flex flex-col text-[10px] text-white/55">
                  <span className="font-semibold text-white/70">Velocidade de rotação</span>
                  <span className="mt-1 text-[9px] leading-4 text-white/30">Intervalo entre mensagens, de 3 a 30 segundos.</span>
                  <span className="mt-3 flex h-10 items-center overflow-hidden rounded-md border border-white/[0.09] bg-[#090909]">
                    <input type="number" min={3} max={30} required value={form.barraAnuncioVelocidade} onChange={(event) => set("barraAnuncioVelocidade", Number(event.target.value))} className="min-w-0 flex-1 bg-transparent px-3 text-xs text-white outline-none" />
                    <span className="border-l border-white/[0.08] px-3 text-[9px] text-white/35">segundos</span>
                  </span>
                </label>
              </section>

              <div className="rounded-md border border-sky-400/15 bg-sky-400/[0.04] px-4 py-3 text-[9px] leading-4 text-sky-100/55">O agendamento individual por data ficará para a fase 2. Nesta versão, mensagens ativas participam da rotação imediatamente.</div>
            </div>
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
              {activeItem ? <activeItem.icon className="h-10 w-10 text-white/20" strokeWidth={1.4} /> : <Settings2 className="h-10 w-10 text-white/20" />}
              <h2 className="font-display mt-4 text-base font-bold text-white">{activeItem?.label ?? "Configuração"}</h2>
              <p className="mt-2 max-w-sm text-xs leading-5 text-white/40">Esta seção está em construção. A estrutura de navegação já está pronta para receber os próximos campos.</p>
            </div>
          )}
        </main>

        <aside className="space-y-4 xl:sticky xl:top-[74px]">
          <section className="rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] p-4">
            <h2 className="font-display text-[14px] font-bold text-white">Prévia da loja</h2>
            <p className="mt-1 text-[9px] text-white/35">Veja como as informações aparecem para o cliente.</p>
            <div className="mt-4 overflow-hidden rounded-md border border-white/[0.1] bg-black" style={{ fontFamily: appearancePreviewFont }}>
              {form.barraAnuncioAtiva && currentPreviewAnnouncement ? (
                <div className="relative min-h-8 px-12 py-2 text-center text-[9px] font-bold" style={{ backgroundColor: announcementPreviewColor, color: contrastText(announcementPreviewColor) }}>
                  <span className="line-clamp-1">{currentPreviewAnnouncement.texto}</span>
                  {previewAnnouncements.length > 1 ? (
                    <span className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                      {previewAnnouncements.map((item, index) => <button key={item.id} type="button" onClick={() => setPreviewAnnouncementIndex(index)} aria-label={`Visualizar mensagem ${index + 1}`} className={`h-1.5 rounded-full bg-current transition-all ${index === previewAnnouncementIndex % previewAnnouncements.length ? "w-3 opacity-90" : "w-1.5 opacity-35"}`} />)}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="flex h-14 items-center justify-between border-b border-white/[0.08] px-4">
                <span className="text-lg text-white/60">☰</span>
                {logoPreview ? <img src={logoPreview} alt="" className="h-9 max-w-28 object-contain" /> : <span className="font-display text-sm font-bold" style={{ color: previewColor }}>{form.nomeLoja}</span>}
                <span className="text-lg text-white/60">⌕　♧</span>
              </div>
              <div className="flex min-h-[196px] flex-col justify-center bg-[radial-gradient(circle_at_75%_30%,rgba(255,255,255,0.1),transparent_38%),linear-gradient(135deg,#151B23,#09090C_70%)] p-5">
                <h3 className="max-w-[250px] text-xl font-extrabold leading-6 text-white"><HighlightedDescription text={form.mensagemFooter} color={previewColor} /></h3>
                <p className="mt-3 line-clamp-3 text-[10px] leading-4 text-white/55">{form.descricaoFooter}</p>
                <div className="mt-5 flex justify-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-white/25" /><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: previewColor }} /><span className="h-1.5 w-1.5 rounded-full bg-white/25" /></div>
              </div>
              {activeSection === "aparencia" ? (
                <div className="border-t border-white/[0.08] bg-[#080808] p-4">
                  <p className="mb-3 text-[8px] font-bold uppercase tracking-[0.16em] text-white/35">Prévia do card</p>
                  <article className={`mx-auto max-w-[220px] overflow-hidden border bg-[linear-gradient(145deg,#151515,#0A0A0A)] transition ${form.productCardStyle === "discount" ? "shadow-[0_0_24px_rgba(169,236,23,0.12)]" : "border-white/10"}`} style={{ borderColor: form.productCardStyle === "discount" ? previewColor : undefined, borderRadius: appearanceCardRadius }}>
                    <div className={`relative flex items-center justify-center bg-[radial-gradient(circle,#303030,#121212_70%)] ${form.productCardStyle === "compact" ? "h-20" : "h-28"}`}>
                      <ImageIcon className="h-10 w-10 text-white/25" />
                      {form.productCardStyle === "discount" ? <span className="absolute left-2 top-2 rounded px-2 py-1 text-[8px] font-black text-black" style={{ backgroundColor: previewColor }}>-25%</span> : null}
                    </div>
                    <div className={form.productCardStyle === "compact" ? "p-2.5" : "p-3.5"}>
                      <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: previewColor }}>Categoria</p>
                      <h4 className={`mt-1 font-extrabold text-white ${form.productCardStyle === "compact" ? "text-[10px]" : "text-xs"}`}>Produto em destaque</h4>
                      {form.showRating ? <div className="mt-2 flex items-center gap-1 text-[8px]" style={{ color: previewColor }}><Star className="h-3 w-3 fill-current" /> 4,9 <span className="text-white/35">(18)</span></div> : null}
                      <strong className="mt-3 block text-sm font-black" style={{ color: previewColor }}>R$ 89,90</strong>
                      <div className="mt-3 space-y-1.5">
                        {form.showBuyNowButton ? <button type="button" className="flex h-8 w-full items-center justify-center text-[8px] font-black uppercase" style={appearanceButtonStyle}>Comprar agora</button> : null}
                        <button type="button" className="flex h-8 w-full items-center justify-center rounded-[7px] border text-[8px] font-bold uppercase" style={{ borderColor: previewColor, color: previewColor }}>Adicionar ao carrinho</button>
                      </div>
                    </div>
                  </article>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] p-4">
            <h2 className="text-[11px] font-semibold text-white">Resumo da loja</h2>
            <dl className="mt-3 space-y-3 text-[9px]">
              <div className="flex justify-between gap-4"><dt className="text-white/40">Nome da loja</dt><dd className="max-w-44 truncate text-right text-white/75">{form.nomeLoja}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/40">Domínio</dt><dd><a href={storefrontUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-white/75 hover:text-[#A9EC17]">{new URL(storefrontUrl).hostname}<ExternalLink className="h-3 w-3" /></a></dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/40">Status</dt><dd className={`rounded-full px-2 py-0.5 font-semibold ${form.lojaAtiva ? "bg-[#A9EC17]/10 text-[#A9EC17]" : "bg-white/5 text-white/40"}`}>{form.lojaAtiva ? "Ativa" : "Inativa"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/40">Plano</dt><dd className="text-white/75">{form.plano}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/40">Última atualização</dt><dd className="text-right text-white/75">{updatedAt}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/40">Moeda</dt><dd className="text-white/75">{form.moeda === "BRL" ? "BRL (R$)" : form.moeda}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/40">Idioma</dt><dd className="text-white/75">{form.idioma === "pt-BR" ? "Português (Brasil)" : form.idioma}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/40">Fuso horário</dt><dd className="max-w-48 text-right text-white/75">{timezoneLabel(form.fusoHorario)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </form>
  );
}
