/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Code2,
  ExternalLink,
  Globe2,
  Headphones,
  Image as ImageIcon,
  Languages,
  Loader2,
  Megaphone,
  MessageSquare,
  MonitorSmartphone,
  Palette,
  PanelBottom,
  RotateCcw,
  Save,
  Settings2,
  Share2,
  ShieldCheck,
  Store,
  Ticket,
  Upload,
  UserRoundCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { saveSettingsAction } from "@/lib/actions/settings";

export type SettingsFormInitial = {
  nomeLoja: string;
  descricaoFooter: string;
  mensagemFooter: string;
  barraAnuncioAtiva: boolean;
  barraAnuncioTexto: string | null;
  barraAnuncioLink: string | null;
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
  updatedAt: string;
};

type FormState = Omit<SettingsFormInitial, "updatedAt" | "barraAnuncioTexto" | "barraAnuncioLink" | "emailSuporte" | "telefoneSuporte" | "whatsapp" | "linkShopee" | "linkInstagram" | "linkFacebook" | "linkTiktok" | "faviconUrl"> & {
  barraAnuncioTexto: string;
  barraAnuncioLink: string;
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

function normalize(initial: SettingsFormInitial): FormState {
  const { updatedAt: _updatedAt, ...values } = initial;
  return {
    ...values,
    barraAnuncioTexto: initial.barraAnuncioTexto ?? "",
    barraAnuncioLink: initial.barraAnuncioLink ?? "",
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
  const logoInput = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const validColor = /^#[0-9a-fA-F]{6}$/.test(form.corPrincipal);
  const previewColor = validColor ? form.corPrincipal : savedForm.corPrincipal;
  const logoPreview = resolveAsset(form.logoUrl, storefrontUrl);
  const faviconPreview = resolveAsset(form.faviconUrl || form.logoUrl, storefrontUrl);
  const activeItem = navigation.flatMap((group) => group.items).find((item) => item.id === activeSection);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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
            <div className="mt-4 overflow-hidden rounded-md border border-white/[0.1] bg-black">
              <div className="px-3 py-2 text-center text-[9px] font-bold text-black" style={{ backgroundColor: previewColor }}>Frete grátis acima de R$ 99,00</div>
              <div className="flex h-14 items-center justify-between border-b border-white/[0.08] px-4">
                <span className="text-lg text-white/60">☰</span>
                {logoPreview ? <img src={logoPreview} alt="" className="h-9 max-w-28 object-contain" /> : <span className="font-display text-sm font-bold" style={{ color: previewColor }}>{form.nomeLoja}</span>}
                <span className="text-lg text-white/60">⌕　♧</span>
              </div>
              <div className="flex min-h-[196px] flex-col justify-center bg-[radial-gradient(circle_at_75%_30%,rgba(255,255,255,0.1),transparent_38%),linear-gradient(135deg,#151B23,#09090C_70%)] p-5">
                <h3 className="font-display max-w-[250px] text-xl font-extrabold leading-6 text-white"><HighlightedDescription text={form.mensagemFooter} color={previewColor} /></h3>
                <p className="mt-3 line-clamp-3 text-[10px] leading-4 text-white/55">{form.descricaoFooter}</p>
                <div className="mt-5 flex justify-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-white/25" /><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: previewColor }} /><span className="h-1.5 w-1.5 rounded-full bg-white/25" /></div>
              </div>
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
