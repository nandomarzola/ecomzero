import Link from "next/link";
import type { ReactNode } from "react";
import {
  AtSign,
  BadgeCheck,
  Barcode,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Handshake,
  Headphones,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  QrCode,
  ShieldCheck,
  Truck,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { getActiveCategories, getStoreSettings } from "@/lib/services/storeContentService";
import {
  storeBusinessHours,
  storeFooterBenefits,
  storeFooterColumns,
  storeFooterSecurityItems,
  whatsappUrl,
  type StoreBusinessHour,
  type StoreFooterColumn,
  type StoreFooterIconKey,
} from "@/lib/storeSettingsDomain";

const footerIconMap: Record<StoreFooterIconKey, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  receipt: FileText,
  badge: BadgeCheck,
  lock: LockKeyhole,
  headset: Headphones,
};

const paymentMethods = [
  { id: "pix", label: "Pix" },
  { id: "visa", label: "Visa" },
  { id: "mastercard", label: "Mastercard" },
  { id: "elo", label: "Elo" },
  { id: "amex", label: "American Express" },
  { id: "boleto", label: "Boleto" },
] as const;

const footerLinkClass =
  "group inline-flex min-h-8 items-center gap-2 text-sm text-white/55 transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]";

function FooterLink({ href, label, newTab = false }: { href: string; label: string; newTab?: boolean }) {
  const content = (
    <>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-[var(--brand-color)]" />
      <span>{label}</span>
    </>
  );

  if (/^https?:\/\//i.test(href) || newTab) {
    return <a href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noreferrer" : undefined} className={footerLinkClass}>{content}</a>;
  }
  return <Link href={href} className={footerLinkClass}>{content}</Link>;
}

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.02em] text-white">{children}</h2>
      <span className="mt-3 block h-0.5 w-9 rounded-full bg-[var(--brand-color)]" />
    </div>
  );
}

function FooterColumnLinks({
  column,
  categories,
}: {
  column: StoreFooterColumn;
  categories: Array<{ id: string; nome: string; slug: string }>;
}) {
  const links = column.tipo === "categorias"
    ? categories.map((category) => ({ id: category.id, label: category.nome, href: `/categorias/${category.slug}`, novaAba: false }))
    : column.links.filter((link) => link.ativo);

  return (
    <ul className="space-y-1.5">
      {links.map((link) => (
        <li key={link.id}>
          <FooterLink href={link.href} label={link.label} newTab={link.novaAba} />
        </li>
      ))}
    </ul>
  );
}

function PaymentMark({ method }: { method: (typeof paymentMethods)[number] }) {
  if (method.id === "pix") {
    return <span className="inline-flex items-center gap-1.5 font-semibold lowercase tracking-tight text-[#45D9D0]"><QrCode className="h-4 w-4" /> pix</span>;
  }
  if (method.id === "visa") {
    return <span className="text-base font-black italic tracking-[-0.08em] text-white">VISA</span>;
  }
  if (method.id === "mastercard") {
    return (
      <span className="inline-flex items-center gap-1.5" aria-label="Mastercard">
        <span className="flex -space-x-1.5"><i className="h-4 w-4 rounded-full bg-[#EB001B]" /><i className="h-4 w-4 rounded-full bg-[#F79E1B] opacity-90" /></span>
        <span className="text-[9px] font-semibold text-white">mastercard</span>
      </span>
    );
  }
  if (method.id === "elo") {
    return <span className="inline-flex items-center gap-1.5 text-base font-black lowercase text-white"><CreditCard className="h-4 w-4 text-[#F9C80E]" /> elo</span>;
  }
  if (method.id === "amex") {
    return <span className="rounded-sm bg-[#1478BE] px-1.5 py-1 text-[8px] font-black uppercase leading-none text-white">American<br />Express</span>;
  }
  return <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-white"><Barcode className="h-5 w-5" /> Boleto</span>;
}

function MercadoPagoMark() {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Mercado Pago">
      <span className="flex h-8 w-10 items-center justify-center rounded-full bg-[#1596D2] text-white">
        <Handshake className="h-5 w-5" />
      </span>
      <span className="font-display text-left text-[11px] font-black leading-[0.9] text-white">mercado<span className="block">pago</span></span>
    </span>
  );
}

function formatHour(value: string) {
  return value.endsWith(":00") ? `${value.slice(0, 2)}h` : value.replace(":", "h");
}

function businessHoursSummary(hours: StoreBusinessHour[]) {
  const weekdays = hours.slice(0, 5);
  const first = weekdays[0];
  if (first && weekdays.every((schedule) => schedule.ativo && schedule.inicio === first.inicio && schedule.fim === first.fim)) {
    return `Segunda a Sexta: ${formatHour(first.inicio)} às ${formatHour(first.fim)}`;
  }
  const active = hours.find((schedule) => schedule.ativo);
  return active ? `${active.label}: ${formatHour(active.inicio)} às ${formatHour(active.fim)}` : "Atendimento indisponível";
}

export default async function Footer() {
  const [allCategories, settings] = await Promise.all([getActiveCategories(), getStoreSettings()]);
  const categories = allCategories.filter((category) => category.depth === 0).slice(0, 8);
  const navigationColumns = storeFooterColumns(settings.footerColumns)
    .filter((column) => column.ativo)
    .sort((first, second) => Number(first.tipo === "categorias") - Number(second.tipo === "categorias"))
    .slice(0, 2);
  const benefits = storeFooterBenefits(settings.footerBenefits).filter((item) => item.ativo);
  const securityItems = storeFooterSecurityItems(settings.footerSecurityItems).filter((item) => item.ativo);
  const businessHours = storeBusinessHours(settings.horariosAtendimento);
  const whatsapp = settings.whatsappAtivo && settings.whatsapp
    ? whatsappUrl(settings.whatsapp, settings.whatsappMensagem)
    : null;
  const socialLinks = [
    settings.instagramAtivo && settings.linkInstagram ? { label: "Instagram", href: settings.linkInstagram, icon: Camera } : null,
    settings.facebookAtivo && settings.linkFacebook ? { label: "Facebook", href: settings.linkFacebook, icon: Users } : null,
    settings.tiktokAtivo && settings.linkTiktok ? { label: "TikTok", href: settings.linkTiktok, icon: AtSign } : null,
    settings.youtubeAtivo && settings.linkYoutube ? { label: "YouTube", href: settings.linkYoutube, icon: Video } : null,
    settings.twitterAtivo && settings.linkTwitter ? { label: "X / Twitter", href: settings.linkTwitter, icon: MessageCircle } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const year = settings.footerCopyrightAno === "fixo" && settings.footerCopyrightAnoFixo
    ? settings.footerCopyrightAnoFixo
    : new Date().getFullYear();

  return (
    <footer className="site-footer border-t border-white/[0.08] bg-black text-white">
      {benefits.length ? (
        <section aria-label="Benefícios da loja" className="mx-auto max-w-[1440px] px-4 pb-8 pt-9 sm:px-6 sm:pb-10 sm:pt-11 lg:px-10">
          <div className="grid overflow-hidden rounded-xl border border-white/[0.1] bg-[linear-gradient(135deg,#0d0d0d,#080808)] sm:grid-cols-2 xl:grid-cols-4">
            {benefits.map((item, index) => {
              const Icon = footerIconMap[item.icone];
              return (
                <article key={item.id} className={`flex min-h-32 items-center gap-4 p-5 sm:p-6 ${index > 0 ? "border-t border-white/[0.08] sm:border-t-0 sm:border-l" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0" : ""} ${index === 3 ? "sm:border-t xl:border-t-0" : ""}`}>
                  <Icon className="h-11 w-11 shrink-0 text-[var(--brand-color)]" strokeWidth={1.55} />
                  <div>
                    <h2 className="font-display text-sm font-extrabold uppercase text-white sm:text-base">{item.titulo}</h2>
                    <p className="mt-1.5 text-sm leading-5 text-white/58">{item.descricao}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="border-y border-white/[0.09]">
        <div className="mx-auto grid max-w-[1440px] gap-9 px-5 py-10 sm:px-6 md:grid-cols-2 lg:px-10 xl:grid-cols-[1.45fr_0.78fr_0.78fr_0.95fr_1.15fr] xl:gap-8 xl:py-12">
          <section className="md:col-span-2 xl:col-span-1 xl:border-r xl:border-white/[0.1] xl:pr-8">
            <Link href="/" aria-label="Ir para o início" className="inline-flex origin-left scale-[1.12] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]">
              <BrandLogo src={settings.logoUrl} name={settings.nomeLoja} />
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-6 text-white/58">{settings.descricaoFooter}</p>
            <div className="mt-7 space-y-4">
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noreferrer" className="group flex items-start gap-3 text-sm text-white/60 transition hover:text-white">
                  <MessageCircle className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand-color)]" />
                  <span><strong className="block text-white">WhatsApp</strong><span className="mt-0.5 block">{settings.whatsapp}</span></span>
                </a>
              ) : null}
              {settings.emailSuporteAtivo && settings.emailSuporte ? (
                <a href={`mailto:${settings.emailSuporte}`} className="group flex items-start gap-3 text-sm text-white/60 transition hover:text-white">
                  <Mail className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand-color)]" />
                  <span><strong className="block text-white">E-mail</strong><span className="mt-0.5 block break-all">{settings.emailSuporte}</span></span>
                </a>
              ) : null}
              {settings.telefoneSuporteAtivo && settings.telefoneSuporte ? (
                <a href={`tel:${settings.telefoneSuporte.replace(/[^\d+]/g, "")}`} className="group flex items-start gap-3 text-sm text-white/60 transition hover:text-white">
                  <Phone className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand-color)]" />
                  <span><strong className="block text-white">Telefone</strong><span className="mt-0.5 block">{settings.telefoneSuporte}</span></span>
                </a>
              ) : null}
              <div className="flex items-start gap-3 text-sm text-white/60">
                <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand-color)]" />
                <span><strong className="block text-white">Horário de atendimento</strong><span className="mt-0.5 block">{businessHoursSummary(businessHours)}</span></span>
              </div>
            </div>
          </section>

          <div className="space-y-2 md:hidden">
            {navigationColumns.map((column) => (
              <details key={column.id} className="group rounded-lg border border-white/[0.09] bg-white/[0.02] px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display text-sm font-extrabold uppercase text-white [&::-webkit-details-marker]:hidden">
                  {column.titulo}
                  <ChevronDown className="h-4 w-4 text-[var(--brand-color)] transition group-open:rotate-180" />
                </summary>
                <div className="mt-3 border-t border-white/[0.08] pt-3"><FooterColumnLinks column={column} categories={categories} /></div>
              </details>
            ))}
          </div>

          {navigationColumns.map((column) => (
            <nav key={column.id} aria-label={column.titulo} className="hidden md:block">
              <FooterHeading>{column.titulo}</FooterHeading>
              <div className="mt-6"><FooterColumnLinks column={column} categories={categories} /></div>
            </nav>
          ))}

          <section>
            <FooterHeading>Compra segura</FooterHeading>
            <ul className="mt-6 space-y-4">
              {securityItems.map((item) => {
                const Icon = footerIconMap[item.icone];
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-color)]" strokeWidth={1.65} />
                    <span className="text-sm leading-5 text-white/60"><strong className="block font-medium text-white/80">{item.titulo}</strong>{item.descricao}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <FooterHeading>Formas de pagamento</FooterHeading>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <span key={method.id} title={method.label} className="flex h-[58px] items-center justify-center rounded-md border border-white/[0.14] bg-[linear-gradient(145deg,#111,#080808)] px-2">
                  <PaymentMark method={method} />
                </span>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-[#1596D2]/30 bg-[#1596D2]/[0.07] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">Pagamento processado por</p>
              <div className="mt-2"><MercadoPagoMark /></div>
              <p className="mt-2 text-[10px] leading-4 text-white/42">Seus dados financeiros são enviados com segurança diretamente ao Mercado Pago.</p>
            </div>
          </section>
        </div>
      </div>

      <div className="border-b border-white/[0.09]">
        <div className="mx-auto grid max-w-[1440px] items-center gap-7 px-5 py-7 sm:px-6 md:grid-cols-[1.5fr_1fr_auto] lg:px-10">
          {settings.footerSeloSeguranca ? (
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-[45%_45%_50%_50%] border border-[var(--brand-color)] text-center font-display text-[9px] font-black uppercase leading-3 text-[var(--brand-color)]">
                <ShieldCheck className="mb-1 h-5 w-5" /> Site seguro
              </span>
              <p className="max-w-md text-sm leading-6 text-white/55">{settings.mensagemFooter}</p>
            </div>
          ) : <span />}
          <div className="flex flex-wrap items-center gap-5 text-white/48">
            <span className="inline-flex items-center gap-2"><LockKeyhole className="h-7 w-7 text-[var(--brand-color)]" /><span className="text-xs"><strong className="block text-sm text-white/70">SSL</strong>Conexão segura</span></span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-[var(--brand-color)]" /><span className="text-xs"><strong className="block text-sm text-white/70">Dados</strong>Protegidos</span></span>
          </div>
          {socialLinks.length ? (
            <div className="flex flex-wrap gap-3 md:justify-end">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.16] text-white/45 transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)]">
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-5 py-6 text-center text-xs leading-5 text-white/42 sm:px-6 lg:px-10">
        <p>© {year} <strong className="font-semibold text-[var(--brand-color)]">{settings.nomeLoja.toUpperCase()}</strong>. {settings.footerCopyrightTexto}</p>
        {settings.razaoSocial || settings.cnpjLoja || settings.enderecoEmpresa ? (
          <p className="mt-1 text-white/30">{[settings.razaoSocial, settings.cnpjLoja ? `CNPJ ${settings.cnpjLoja}` : null, settings.enderecoEmpresa].filter(Boolean).join(" · ")}</p>
        ) : null}
      </div>
    </footer>
  );
}
