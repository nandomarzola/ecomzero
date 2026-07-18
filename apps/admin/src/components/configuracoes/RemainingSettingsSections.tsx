/* eslint-disable @next/next/no-img-element */
"use client";

import {
  AtSign,
  BadgeCheck,
  BarChart3,
  Camera,
  Clock3,
  Code2,
  FileText,
  Globe2,
  Headphones,
  LockKeyhole,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import type {
  BusinessHourConfig,
  FooterColumnConfig,
  FooterContentItemConfig,
  FooterIconKey,
} from "@/lib/settingsConfigDomain";

export type RemainingSettingsFields = {
  descricaoFooter: string;
  mensagemFooter: string;
  linkYoutube: string;
  linkTwitter: string;
  instagramAtivo: boolean;
  facebookAtivo: boolean;
  tiktokAtivo: boolean;
  youtubeAtivo: boolean;
  twitterAtivo: boolean;
  shopeeAtivo: boolean;
  linkMercadoLivre: string;
  mercadoLivreAtivo: boolean;
  linkTiktokShop: string;
  tiktokShopAtivo: boolean;
  linkShein: string;
  sheinAtivo: boolean;
  emailSuporteAtivo: boolean;
  telefoneSuporteAtivo: boolean;
  whatsappAtivo: boolean;
  whatsappMensagem: string;
  horariosAtendimento: BusinessHourConfig[];
  footerColumns: FooterColumnConfig[];
  footerBenefits: FooterContentItemConfig[];
  footerSecurityItems: FooterContentItemConfig[];
  footerSeloSeguranca: boolean;
  footerCopyrightTexto: string;
  footerCopyrightAno: "automatico" | "fixo";
  footerCopyrightAnoFixo: number | null;
  razaoSocial: string;
  cnpjLoja: string;
  enderecoEmpresa: string;
  mensagemBoasVindasAtiva: boolean;
  mensagemBoasVindas: string;
  mensagemPedidoConfirmadoAtiva: boolean;
  mensagemPedidoConfirmado: string;
  mensagemPedidoEnviadoAtiva: boolean;
  mensagemPedidoEnviado: string;
  mensagemPedidoEntregueAtiva: boolean;
  mensagemPedidoEntregue: string;
  metaPixelAtivo: boolean;
  metaPixelId: string;
  googleAnalyticsAtivo: boolean;
  googleAnalyticsId: string;
  googleTagManagerAtivo: boolean;
  googleTagManagerId: string;
  tiktokPixelAtivo: boolean;
  tiktokPixelId: string;
  customHeadCodeAtivo: boolean;
  customHeadCode: string;
  modoManutencao: boolean;
  mensagemManutencao: string;
  valorMinimoPedido: number;
};

type RemainingKey = keyof RemainingSettingsFields;
type Change = (key: RemainingKey, value: RemainingSettingsFields[RemainingKey]) => void;

const inputClass = "h-10 rounded-md border border-white/[0.09] bg-[#090909] px-3 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-[#A9EC17]/45";
const panelClass = "rounded-md border border-white/[0.07] bg-black/[0.08] p-4";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={onChange} className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#A9EC17]" : "bg-white/15"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-black transition ${checked ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return <header><h2 className="font-display text-[15px] font-bold text-white">{title}</h2><p className="mt-1 text-[10px] text-white/38">{description}</p></header>;
}

const footerIconOptions: Array<{ value: FooterIconKey; label: string; icon: typeof Truck }> = [
  { value: "truck", label: "Entrega", icon: Truck },
  { value: "shield", label: "Escudo", icon: ShieldCheck },
  { value: "receipt", label: "Documento", icon: FileText },
  { value: "badge", label: "Certificado", icon: BadgeCheck },
  { value: "lock", label: "Cadeado", icon: LockKeyhole },
  { value: "headset", label: "Atendimento", icon: Headphones },
];

function FooterItemsEditor({
  items,
  onUpdate,
}: {
  items: FooterContentItemConfig[];
  onUpdate: (id: string, patch: Partial<FooterContentItemConfig>) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {items.map((item) => {
        const Icon = footerIconOptions.find((option) => option.value === item.icone)?.icon ?? ShieldCheck;
        return (
          <article key={item.id} className="rounded-md border border-white/[0.08] bg-[#090909] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#A9EC17]/20 bg-[#A9EC17]/[0.05] text-[#A9EC17]">
                <Icon className="h-4 w-4" />
              </span>
              <Toggle checked={item.ativo} onChange={() => onUpdate(item.id, { ativo: !item.ativo })} label={`Exibir ${item.titulo}`} />
            </div>
            <div className="mt-3 grid gap-2">
              <input aria-label="Título" required maxLength={40} value={item.titulo} onChange={(event) => onUpdate(item.id, { titulo: event.target.value })} className={inputClass} />
              <input aria-label="Descrição" required maxLength={100} value={item.descricao} onChange={(event) => onUpdate(item.id, { descricao: event.target.value })} className={inputClass} />
              <select aria-label="Ícone" value={item.icone} onChange={(event) => onUpdate(item.id, { icone: event.target.value as FooterIconKey })} className={inputClass}>
                {footerIconOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function FooterSettingsSection({
  form,
  emailSuporte,
  telefoneSuporte,
  whatsapp,
  linkInstagram,
  linkFacebook,
  linkTiktok,
  onChange,
  onContactChange,
  onSocialChange,
}: {
  form: RemainingSettingsFields;
  emailSuporte: string;
  telefoneSuporte: string;
  whatsapp: string;
  linkInstagram: string;
  linkFacebook: string;
  linkTiktok: string;
  onChange: Change;
  onContactChange: (key: "emailSuporte" | "telefoneSuporte" | "whatsapp", value: string) => void;
  onSocialChange: (key: "linkInstagram" | "linkFacebook" | "linkTiktok", value: string) => void;
}) {
  function updateColumn(id: string, patch: Partial<FooterColumnConfig>) {
    onChange("footerColumns", form.footerColumns.map((column) => column.id === id ? { ...column, ...patch } : column));
  }

  function addColumn() {
    if (form.footerColumns.length >= 5) return;
    onChange("footerColumns", [...form.footerColumns, { id: crypto.randomUUID(), titulo: "Nova coluna", tipo: "links", ativo: true, links: [] }]);
  }

  function addLink(columnId: string) {
    onChange("footerColumns", form.footerColumns.map((column) => column.id === columnId
      ? { ...column, links: [...column.links, { id: crypto.randomUUID(), label: "Novo link", href: "/", ativo: true, novaAba: false }] }
      : column));
  }

  function updateLink(columnId: string, linkId: string, patch: Partial<FooterColumnConfig["links"][number]>) {
    onChange("footerColumns", form.footerColumns.map((column) => column.id === columnId
      ? { ...column, links: column.links.map((link) => link.id === linkId ? { ...link, ...patch } : link) }
      : column));
  }

  function removeLink(columnId: string, linkId: string) {
    onChange("footerColumns", form.footerColumns.map((column) => column.id === columnId
      ? { ...column, links: column.links.filter((link) => link.id !== linkId) }
      : column));
  }

  function updateFooterItem(
    key: "footerBenefits" | "footerSecurityItems",
    id: string,
    patch: Partial<FooterContentItemConfig>,
  ) {
    onChange(key, form[key].map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Rodapé" description="Configure todo o conteúdo do novo rodapé. As formas de pagamento são fixas e processadas pelo Mercado Pago." />
      <section className={`${panelClass} grid gap-4 sm:grid-cols-2`}>
        <label className="flex flex-col gap-1.5 text-[10px] text-white/55 sm:col-span-2">
          Descrição ao lado da logo
          <textarea required minLength={10} maxLength={160} value={form.descricaoFooter} onChange={(event) => onChange("descricaoFooter", event.target.value)} className={`${inputClass} min-h-20 resize-y py-3`} />
        </label>
        <label className="flex flex-col gap-1.5 text-[10px] text-white/55 sm:col-span-2">
          Mensagem do bloco “Site seguro”
          <textarea required minLength={5} maxLength={160} value={form.mensagemFooter} onChange={(event) => onChange("mensagemFooter", event.target.value)} className={`${inputClass} min-h-20 resize-y py-3`} />
        </label>
      </section>
      <section className={`${panelClass} space-y-4`}>
        <div><h3 className="text-[10px] font-semibold text-white/70">Faixa superior de benefícios</h3><p className="mt-1 text-[9px] text-white/30">Quatro destaques exibidos no topo do rodapé, como no layout de referência.</p></div>
        <FooterItemsEditor items={form.footerBenefits} onUpdate={(id, patch) => updateFooterItem("footerBenefits", id, patch)} />
      </section>
      <ContactSettingsSection
        form={form}
        emailSuporte={emailSuporte}
        telefoneSuporte={telefoneSuporte}
        whatsapp={whatsapp}
        onChange={onChange}
        onContactChange={onContactChange}
      />
      <HoursSettingsSection form={form} onChange={onChange} />
      <section className={`${panelClass} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-[10px] font-semibold text-white/70">Colunas de navegação</h3><p className="mt-1 text-[9px] text-white/30">O layout mostra as duas primeiras colunas de links ativas. Categorias entram automaticamente se faltar uma segunda coluna de links.</p></div>
          <button type="button" onClick={addColumn} disabled={form.footerColumns.length >= 5} className="inline-flex h-8 items-center gap-2 rounded-md border border-[#A9EC17]/35 px-3 text-[9px] font-semibold text-[#A9EC17] disabled:opacity-35"><Plus className="h-3.5 w-3.5" /> Nova coluna</button>
        </div>
        <div className="space-y-3">
          {form.footerColumns.map((column, columnIndex) => (
            <article key={column.id} className="rounded-md border border-white/[0.08] bg-[#090909] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label={`Título da coluna ${columnIndex + 1}`} value={column.titulo} maxLength={30} onChange={(event) => updateColumn(column.id, { titulo: event.target.value })} className={`${inputClass} min-w-40 flex-1`} />
                <select aria-label="Tipo da coluna" value={column.tipo} onChange={(event) => updateColumn(column.id, { tipo: event.target.value as FooterColumnConfig["tipo"] })} className={`${inputClass} min-w-36`}>
                  <option value="links">Links manuais</option><option value="categorias">Categorias automáticas</option>
                </select>
                <Toggle checked={column.ativo} onChange={() => updateColumn(column.id, { ativo: !column.ativo })} label={`Exibir coluna ${column.titulo}`} />
                <button type="button" aria-label={`Excluir coluna ${column.titulo}`} onClick={() => onChange("footerColumns", form.footerColumns.filter((item) => item.id !== column.id))} className="flex h-9 w-9 items-center justify-center rounded-md text-red-300/65 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
              </div>
              {column.tipo === "categorias" ? <p className="mt-3 rounded-md border border-sky-400/15 bg-sky-400/[0.04] px-3 py-2 text-[9px] text-sky-100/55">Os links serão as categorias raiz ativas, sem conteúdo duplicado no formulário.</p> : (
                <div className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <div key={link.id} className="grid gap-2 rounded-md border border-white/[0.06] p-2 sm:grid-cols-[1fr_1.4fr_auto_auto] sm:items-center">
                      <input aria-label="Nome do link" value={link.label} maxLength={40} onChange={(event) => updateLink(column.id, link.id, { label: event.target.value })} className={inputClass} />
                      <input aria-label="Destino do link" value={link.href} onChange={(event) => updateLink(column.id, link.id, { href: event.target.value })} placeholder="/pagina ou https://..." className={inputClass} />
                      <Toggle checked={link.ativo} onChange={() => updateLink(column.id, link.id, { ativo: !link.ativo })} label={`Exibir link ${link.label}`} />
                      <button type="button" aria-label={`Remover link ${link.label}`} onClick={() => removeLink(column.id, link.id)} className="flex h-9 w-9 items-center justify-center rounded-md text-red-300/65 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addLink(column.id)} disabled={column.links.length >= 10} className="inline-flex h-8 items-center gap-1.5 text-[9px] font-semibold text-[#A9EC17] disabled:opacity-35"><Plus className="h-3 w-3" /> Adicionar link</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className={`${panelClass} space-y-4`}>
        <div><h3 className="text-[10px] font-semibold text-white/70">Coluna “Compra segura”</h3><p className="mt-1 text-[9px] text-white/30">Edite os cinco argumentos de confiança exibidos ao lado dos links.</p></div>
        <FooterItemsEditor items={form.footerSecurityItems} onUpdate={(id, patch) => updateFooterItem("footerSecurityItems", id, patch)} />
      </section>
      <section className="rounded-md border border-sky-400/15 bg-sky-400/[0.04] px-4 py-3">
        <p className="text-[10px] font-semibold text-sky-100/70">Formas de pagamento</p>
        <p className="mt-1 text-[9px] leading-4 text-sky-100/45">Pix, cartões e boleto são informações fixas do checkout. O footer sempre informa que o processamento é feito pelo Mercado Pago.</p>
      </section>
      <SocialSettingsSection
        form={form}
        linkInstagram={linkInstagram}
        linkFacebook={linkFacebook}
        linkTiktok={linkTiktok}
        onChange={onChange}
        onLegacyChange={onSocialChange}
      />
      <section className={`${panelClass} grid gap-4 sm:grid-cols-2`}>
        <label className="flex flex-col gap-1.5 text-[10px] text-white/55">Razão social<input value={form.razaoSocial} maxLength={100} onChange={(event) => onChange("razaoSocial", event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1.5 text-[10px] text-white/55">CNPJ<input value={form.cnpjLoja} maxLength={18} onChange={(event) => onChange("cnpjLoja", event.target.value)} placeholder="00.000.000/0000-00" className={inputClass} /></label>
        <label className="flex flex-col gap-1.5 text-[10px] text-white/55 sm:col-span-2">Endereço da empresa<input value={form.enderecoEmpresa} maxLength={180} onChange={(event) => onChange("enderecoEmpresa", event.target.value)} className={inputClass} /></label>
      </section>
      <section className={`${panelClass} space-y-4`}>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <label className="flex flex-col gap-1.5 text-[10px] text-white/55">Texto do copyright<input required value={form.footerCopyrightTexto} maxLength={120} onChange={(event) => onChange("footerCopyrightTexto", event.target.value)} className={inputClass} /></label>
          <label className="flex flex-col gap-1.5 text-[10px] text-white/55">Ano<select value={form.footerCopyrightAno} onChange={(event) => onChange("footerCopyrightAno", event.target.value as "automatico" | "fixo")} className={inputClass}><option value="automatico">Automático</option><option value="fixo">Fixo</option></select></label>
        </div>
        {form.footerCopyrightAno === "fixo" ? <label className="flex max-w-48 flex-col gap-1.5 text-[10px] text-white/55">Ano fixo<input type="number" min={2000} max={2200} value={form.footerCopyrightAnoFixo ?? ""} onChange={(event) => onChange("footerCopyrightAnoFixo", event.target.value ? Number(event.target.value) : null)} className={inputClass} /></label> : null}
        <div className="flex items-center justify-between gap-4 rounded-md border border-white/[0.07] bg-[#090909] p-3"><div className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 text-[#A9EC17]" /><div><p className="text-[10px] font-medium text-white/65">Selo “Compra protegida”</p><p className="mt-0.5 text-[9px] text-white/28">Exibe o card de segurança no rodapé.</p></div></div><Toggle checked={form.footerSeloSeguranca} onChange={() => onChange("footerSeloSeguranca", !form.footerSeloSeguranca)} label="Exibir selo de compra protegida" /></div>
      </section>
    </div>
  );
}

export function ContactSettingsSection({ form, emailSuporte, telefoneSuporte, whatsapp, onChange, onContactChange }: { form: RemainingSettingsFields; emailSuporte: string; telefoneSuporte: string; whatsapp: string; onChange: Change; onContactChange: (key: "emailSuporte" | "telefoneSuporte" | "whatsapp", value: string) => void }) {
  const rows = [
    { key: "emailSuporteAtivo" as const, valueKey: "emailSuporte" as const, label: "E-mail", value: emailSuporte, placeholder: "atendimento@sualoja.com.br", icon: Mail },
    { key: "telefoneSuporteAtivo" as const, valueKey: "telefoneSuporte" as const, label: "Telefone", value: telefoneSuporte, placeholder: "(11) 0000-0000", icon: Phone },
    { key: "whatsappAtivo" as const, valueKey: "whatsapp" as const, label: "WhatsApp", value: whatsapp, placeholder: "5511999999999", icon: MessageCircle },
  ];
  return <div className="space-y-5"><SectionHeader title="Canais de atendimento" description="Defina quais contatos aparecem no rodapé e no botão flutuante da loja." /><section className={`${panelClass} space-y-3`}>{rows.map(({ key, valueKey, label, value, placeholder, icon: Icon }) => <div key={key} className="rounded-md border border-white/[0.07] bg-[#090909] p-3"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-[#A9EC17]" /><span className="text-[10px] font-semibold text-white/65">{label}</span></div><Toggle checked={form[key]} onChange={() => onChange(key, !form[key])} label={`Ativar ${label}`} /></div><input value={value} onChange={(event) => onContactChange(valueKey, event.target.value)} placeholder={placeholder} className={`${inputClass} mt-3 w-full`} /></div>)}</section><section className={panelClass}><label className="flex flex-col gap-1.5 text-[10px] text-white/55">Mensagem inicial do WhatsApp<textarea required value={form.whatsappMensagem} maxLength={200} onChange={(event) => onChange("whatsappMensagem", event.target.value)} className={`${inputClass} min-h-20 resize-y py-3`} /><span className="text-[9px] text-white/30">Preenchida automaticamente quando o cliente abre o atendimento.</span></label></section></div>;
}

export function HoursSettingsSection({ form, onChange }: { form: RemainingSettingsFields; onChange: Change }) {
  function update(index: number, patch: Partial<BusinessHourConfig>) { onChange("horariosAtendimento", form.horariosAtendimento.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }
  return <div className="space-y-5"><SectionHeader title="Horários de atendimento" description="Informe a disponibilidade que será exibida para os clientes." /><section className={`${panelClass} divide-y divide-white/[0.06]`}>{form.horariosAtendimento.map((schedule, index) => <div key={schedule.dia} className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto_105px_12px_105px] sm:items-center"><div><p className="text-[10px] font-semibold text-white/65">{schedule.label}</p><p className="mt-0.5 text-[9px] text-white/28">{schedule.ativo ? `${schedule.inicio} às ${schedule.fim}` : "Fechado"}</p></div><Toggle checked={schedule.ativo} onChange={() => update(index, { ativo: !schedule.ativo })} label={`Atendimento em ${schedule.label}`} /><input type="time" disabled={!schedule.ativo} value={schedule.inicio} onChange={(event) => update(index, { inicio: event.target.value })} className={`${inputClass} disabled:opacity-35`} /><span className="text-center text-[9px] text-white/25">às</span><input type="time" disabled={!schedule.ativo} value={schedule.fim} onChange={(event) => update(index, { fim: event.target.value })} className={`${inputClass} disabled:opacity-35`} /></div>)}</section></div>;
}

type LinkEnabledKey = "instagramAtivo" | "facebookAtivo" | "tiktokAtivo" | "youtubeAtivo" | "twitterAtivo" | "shopeeAtivo" | "mercadoLivreAtivo" | "tiktokShopAtivo" | "sheinAtivo";
type LinkValueKey = "linkInstagram" | "linkFacebook" | "linkTiktok" | "linkYoutube" | "linkTwitter" | "linkShopee" | "linkMercadoLivre" | "linkTiktokShop" | "linkShein";
type LinkRow = { enabledKey: LinkEnabledKey; valueKey: LinkValueKey; label: string; placeholder: string; icon: typeof Globe2 };

function LinkSettings({ rows, enabled, values, onToggle, onValueChange }: { rows: LinkRow[]; enabled: Record<LinkEnabledKey, boolean>; values: Record<LinkValueKey, string>; onToggle: (key: LinkEnabledKey) => void; onValueChange: (key: LinkValueKey, value: string) => void }) {
  return <section className={`${panelClass} space-y-3`}>{rows.map(({ enabledKey, valueKey, label, placeholder, icon: Icon }) => <div key={enabledKey} className="rounded-md border border-white/[0.07] bg-[#090909] p-3"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-[#A9EC17]" /><span className="text-[10px] font-semibold text-white/65">{label}</span></div><Toggle checked={enabled[enabledKey]} onChange={() => onToggle(enabledKey)} label={`Exibir ${label}`} /></div><input value={values[valueKey]} onChange={(event) => onValueChange(valueKey, event.target.value)} placeholder={placeholder} className={`${inputClass} mt-3 w-full`} /></div>)}</section>;
}

function linkEnabledValues(form: RemainingSettingsFields): Record<LinkEnabledKey, boolean> {
  return { instagramAtivo: form.instagramAtivo, facebookAtivo: form.facebookAtivo, tiktokAtivo: form.tiktokAtivo, youtubeAtivo: form.youtubeAtivo, twitterAtivo: form.twitterAtivo, shopeeAtivo: form.shopeeAtivo, mercadoLivreAtivo: form.mercadoLivreAtivo, tiktokShopAtivo: form.tiktokShopAtivo, sheinAtivo: form.sheinAtivo };
}

export function SocialSettingsSection({ form, linkInstagram, linkFacebook, linkTiktok, onChange, onLegacyChange }: { form: RemainingSettingsFields; linkInstagram: string; linkFacebook: string; linkTiktok: string; onChange: Change; onLegacyChange: (key: "linkInstagram" | "linkFacebook" | "linkTiktok", value: string) => void }) {
  const values: Record<LinkValueKey, string> = { linkInstagram, linkFacebook, linkTiktok, linkYoutube: form.linkYoutube, linkTwitter: form.linkTwitter, linkShopee: "", linkMercadoLivre: "", linkTiktokShop: "", linkShein: "" };
  function updateSocialLink(key: LinkValueKey, value: string) {
    if (key === "linkInstagram" || key === "linkFacebook" || key === "linkTiktok") onLegacyChange(key, value);
    else if (key === "linkYoutube" || key === "linkTwitter") onChange(key, value);
  }
  return <div className="space-y-5"><SectionHeader title="Redes sociais" description="Ative somente os perfis que devem aparecer no rodapé da loja." /><LinkSettings enabled={linkEnabledValues(form)} values={values} onToggle={(key) => onChange(key, !form[key])} onValueChange={updateSocialLink} rows={[
    { enabledKey: "instagramAtivo", valueKey: "linkInstagram", label: "Instagram", placeholder: "https://instagram.com/sualoja", icon: Camera },
    { enabledKey: "facebookAtivo", valueKey: "linkFacebook", label: "Facebook", placeholder: "https://facebook.com/sualoja", icon: Users },
    { enabledKey: "tiktokAtivo", valueKey: "linkTiktok", label: "TikTok", placeholder: "https://tiktok.com/@sualoja", icon: AtSign },
    { enabledKey: "youtubeAtivo", valueKey: "linkYoutube", label: "YouTube", placeholder: "https://youtube.com/@sualoja", icon: Video },
    { enabledKey: "twitterAtivo", valueKey: "linkTwitter", label: "X / Twitter", placeholder: "https://x.com/sualoja", icon: MessageCircle },
  ]} /></div>;
}

export function MarketplaceSettingsSection({ form, linkShopee, onChange, onShopeeChange }: { form: RemainingSettingsFields; linkShopee: string; onChange: Change; onShopeeChange: (value: string) => void }) {
  const values: Record<LinkValueKey, string> = { linkInstagram: "", linkFacebook: "", linkTiktok: "", linkYoutube: "", linkTwitter: "", linkShopee, linkMercadoLivre: form.linkMercadoLivre, linkTiktokShop: form.linkTiktokShop, linkShein: form.linkShein };
  function updateMarketplaceLink(key: LinkValueKey, value: string) {
    if (key === "linkShopee") onShopeeChange(value);
    else if (key === "linkMercadoLivre" || key === "linkTiktokShop" || key === "linkShein") onChange(key, value);
  }
  return <div className="space-y-5"><SectionHeader title="Marketplaces" description="Publique atalhos para os canais oficiais da marca. Esta seção não importa pedidos desses canais." /><LinkSettings enabled={linkEnabledValues(form)} values={values} onToggle={(key) => onChange(key, !form[key])} onValueChange={updateMarketplaceLink} rows={[
    { enabledKey: "shopeeAtivo", valueKey: "linkShopee", label: "Shopee", placeholder: "https://shopee.com.br/sualoja", icon: ShoppingBag },
    { enabledKey: "mercadoLivreAtivo", valueKey: "linkMercadoLivre", label: "Mercado Livre", placeholder: "https://www.mercadolivre.com.br/perfil/sualoja", icon: Store },
    { enabledKey: "tiktokShopAtivo", valueKey: "linkTiktokShop", label: "TikTok Shop", placeholder: "https://shop.tiktok.com/...", icon: PackageCheck },
    { enabledKey: "sheinAtivo", valueKey: "linkShein", label: "Shein", placeholder: "https://br.shein.com/store/...", icon: ShoppingBag },
  ]} /></div>;
}

export function MessagesSettingsSection({ form, onChange }: { form: RemainingSettingsFields; onChange: Change }) {
  const templates = [
    { enabled: "mensagemBoasVindasAtiva" as const, field: "mensagemBoasVindas" as const, title: "Boas-vindas", note: "Preparada para o canal de boas-vindas; o sino atual exibe eventos vinculados a pedidos." },
    { enabled: "mensagemPedidoConfirmadoAtiva" as const, field: "mensagemPedidoConfirmado" as const, title: "Pagamento confirmado", note: "Usada no sino quando o pagamento do pedido for confirmado." },
    { enabled: "mensagemPedidoEnviadoAtiva" as const, field: "mensagemPedidoEnviado" as const, title: "Pedido enviado", note: "Usada quando o rastreio entrar em transporte." },
    { enabled: "mensagemPedidoEntregueAtiva" as const, field: "mensagemPedidoEntregue" as const, title: "Pedido entregue", note: "Usada na notificação de entrega confirmada." },
  ];
  return <div className="space-y-5"><SectionHeader title="Mensagens" description="Personalize as notificações persistentes exibidas na área do cliente." /><div className="rounded-md border border-sky-400/15 bg-sky-400/[0.04] px-4 py-3 text-[9px] leading-4 text-sky-100/55">Variáveis disponíveis: <strong>{"{nome_cliente}"}</strong> e <strong>{"{numero_pedido}"}</strong>.</div><section className={`${panelClass} space-y-3`}>{templates.map((template) => <article key={template.field} className="rounded-md border border-white/[0.07] bg-[#090909] p-3"><div className="flex items-center justify-between gap-4"><div><h3 className="text-[10px] font-semibold text-white/70">{template.title}</h3><p className="mt-1 text-[9px] text-white/30">{template.note}</p></div><Toggle checked={form[template.enabled]} onChange={() => onChange(template.enabled, !form[template.enabled])} label={`Ativar mensagem ${template.title}`} /></div><textarea required value={form[template.field]} maxLength={300} onChange={(event) => onChange(template.field, event.target.value)} className={`${inputClass} mt-3 min-h-20 w-full resize-y py-3`} /><span className="mt-1 block text-right text-[8px] text-white/25">{form[template.field].length}/300</span></article>)}</section></div>;
}

export function TrackingSettingsSection({ form, onChange }: { form: RemainingSettingsFields; onChange: Change }) {
  const trackers = [
    { enabled: "metaPixelAtivo" as const, field: "metaPixelId" as const, title: "Meta Pixel", placeholder: "123456789012345", icon: Users },
    { enabled: "googleAnalyticsAtivo" as const, field: "googleAnalyticsId" as const, title: "Google Analytics", placeholder: "G-XXXXXXXXXX", icon: BarChart3 },
    { enabled: "googleTagManagerAtivo" as const, field: "googleTagManagerId" as const, title: "Google Tag Manager", placeholder: "GTM-XXXXXXX", icon: Globe2 },
    { enabled: "tiktokPixelAtivo" as const, field: "tiktokPixelId" as const, title: "TikTok Pixel", placeholder: "ID do pixel", icon: AtSign },
  ];
  return <div className="space-y-5"><SectionHeader title="Pixel e códigos" description="Instale rastreamento no storefront sem editar o código da aplicação." /><section className={`${panelClass} space-y-3`}>{trackers.map(({ enabled, field, title, placeholder, icon: Icon }) => <article key={field} className="rounded-md border border-white/[0.07] bg-[#090909] p-3"><div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2.5 text-[10px] font-semibold text-white/65"><Icon className="h-4 w-4 text-[#A9EC17]" />{title}</span><Toggle checked={form[enabled]} onChange={() => onChange(enabled, !form[enabled])} label={`Ativar ${title}`} /></div><input value={form[field]} onChange={(event) => onChange(field, event.target.value)} placeholder={placeholder} className={`${inputClass} mt-3 w-full`} /></article>)}</section><section className={panelClass}><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2.5"><Code2 className="h-4 w-4 text-[#A9EC17]" /><div><h3 className="text-[10px] font-semibold text-white/65">JavaScript personalizado no head</h3><p className="mt-1 text-[9px] text-white/30">Cole somente o conteúdo JavaScript, sem tags &lt;script&gt;. Use apenas códigos confiáveis.</p></div></div><Toggle checked={form.customHeadCodeAtivo} onChange={() => onChange("customHeadCodeAtivo", !form.customHeadCodeAtivo)} label="Ativar código personalizado" /></div><textarea value={form.customHeadCode} maxLength={12000} spellCheck={false} onChange={(event) => onChange("customHeadCode", event.target.value)} placeholder="console.log('integração carregada');" className={`${inputClass} mt-3 min-h-36 w-full resize-y font-mono py-3`} /></section></div>;
}

export function GeneralSettingsSection({ form, onChange }: { form: RemainingSettingsFields; onChange: Change }) {
  return <div className="space-y-5"><SectionHeader title="Geral" description="Controle a disponibilidade da loja e regras globais do checkout." /><section className={panelClass}><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2.5"><Clock3 className="h-4 w-4 text-amber-300" /><div><h3 className="text-[10px] font-semibold text-white/70">Modo manutenção</h3><p className="mt-1 text-[9px] text-white/30">Substitui a navegação da loja por uma página de manutenção. APIs e admin continuam disponíveis.</p></div></div><Toggle checked={form.modoManutencao} onChange={() => onChange("modoManutencao", !form.modoManutencao)} label="Ativar modo manutenção" /></div><textarea required value={form.mensagemManutencao} maxLength={240} onChange={(event) => onChange("mensagemManutencao", event.target.value)} className={`${inputClass} mt-4 min-h-20 w-full resize-y py-3`} /></section><section className={panelClass}><label className="flex flex-col gap-1.5 text-[10px] text-white/55">Valor mínimo do pedido (R$)<input type="number" min={0} max={100000} step="0.01" value={form.valorMinimoPedido} onChange={(event) => onChange("valorMinimoPedido", Number(event.target.value))} className={inputClass} /><span className="text-[9px] text-white/30">Use 0 para não exigir valor mínimo. A regra é validada novamente no servidor ao criar o pedido.</span></label></section><div className="rounded-md border border-white/[0.07] bg-black/[0.08] px-4 py-3 text-[9px] leading-4 text-white/35">Controle de estoque baixo não foi incluído porque o catálogo atual não possui estoque por produto/variante. Exibir um alerta sem uma fonte real seria enganoso.</div></div>;
}

export function FooterPreview({ form, nomeLoja, mensagemFooter, logoUrl, color }: { form: RemainingSettingsFields; nomeLoja: string; mensagemFooter: string; logoUrl: string; color: string }) {
  const year = form.footerCopyrightAno === "fixo" && form.footerCopyrightAnoFixo ? form.footerCopyrightAnoFixo : new Date().getFullYear();
  const columns = form.footerColumns
    .filter((column) => column.ativo)
    .sort((first, second) => Number(first.tipo === "categorias") - Number(second.tipo === "categorias"))
    .slice(0, 2);
  return (
    <div className="overflow-hidden bg-[#050505] text-white">
      <div className="grid grid-cols-4 gap-px border-b border-white/[0.08] bg-white/[0.08] p-px">
        {form.footerBenefits.filter((item) => item.ativo).map((item) => (
          <div key={item.id} className="bg-[#0A0A0A] p-2">
            <BadgeCheck className="h-3.5 w-3.5" style={{ color }} />
            <strong className="mt-1 block text-[6px] uppercase text-white/75">{item.titulo}</strong>
            <p className="mt-0.5 line-clamp-2 text-[5px] leading-2 text-white/30">{item.descricao}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] gap-2 p-3">
        <div>
          {logoUrl ? <img src={logoUrl} alt="" className="h-6 max-w-20 object-contain" /> : <strong className="text-[8px]" style={{ color }}>{nomeLoja}</strong>}
          <p className="mt-2 line-clamp-3 text-[5px] leading-2 text-white/35">{form.descricaoFooter}</p>
          {form.whatsappAtivo ? <p className="mt-2 text-[5px] text-white/45">WhatsApp</p> : null}
        </div>
        {columns.map((column) => (
          <div key={column.id}>
            <strong className="text-[6px] uppercase text-white/70">{column.titulo}</strong>
            <span className="mt-1 block h-px w-4" style={{ backgroundColor: color }} />
            <div className="mt-2 space-y-1 text-[5px] text-white/35">
              {column.tipo === "categorias" ? <><p>Categoria principal</p><p>Outra categoria</p></> : column.links.filter((link) => link.ativo).slice(0, 4).map((link) => <p key={link.id}>{link.label}</p>)}
            </div>
          </div>
        ))}
        <div>
          <strong className="text-[6px] uppercase text-white/70">Compra segura</strong>
          <span className="mt-1 block h-px w-4" style={{ backgroundColor: color }} />
          <div className="mt-2 space-y-1 text-[5px] text-white/35">{form.footerSecurityItems.filter((item) => item.ativo).slice(0, 5).map((item) => <p key={item.id}>{item.titulo}</p>)}</div>
        </div>
        <div>
          <strong className="text-[6px] uppercase text-white/70">Pagamento</strong>
          <span className="mt-1 block h-px w-4" style={{ backgroundColor: color }} />
          <div className="mt-2 grid grid-cols-2 gap-1">{["Pix", "Visa", "Master", "Elo", "Amex", "Boleto"].map((method) => <span key={method} className="rounded border border-white/10 px-1 py-1 text-center text-[4px] text-white/55">{method}</span>)}</div>
          <p className="mt-1.5 text-[4px] font-semibold text-sky-300">via Mercado Pago</p>
        </div>
      </div>
      <div className="flex items-center gap-2 border-y border-white/[0.08] px-3 py-2">
        {form.footerSeloSeguranca ? <BadgeCheck className="h-3.5 w-3.5" style={{ color }} /> : null}
        <p className="line-clamp-2 flex-1 text-[5px] text-white/35">{mensagemFooter}</p>
        {form.instagramAtivo ? <Camera className="h-3 w-3" style={{ color }} /> : null}
        {form.facebookAtivo ? <Users className="h-3 w-3" style={{ color }} /> : null}
        {form.youtubeAtivo ? <Video className="h-3 w-3" style={{ color }} /> : null}
      </div>
      <div className="p-2 text-center text-[5px] leading-2 text-white/30">
        <p>© {year} {nomeLoja}. {form.footerCopyrightTexto}</p>
        {form.razaoSocial || form.cnpjLoja ? <p>{[form.razaoSocial, form.cnpjLoja].filter(Boolean).join(" · ")}</p> : null}
      </div>
    </div>
  );
}
