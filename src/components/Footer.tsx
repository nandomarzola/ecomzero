import Link from "next/link";
import {
  AtSign,
  Camera,
  Clock3,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Users,
  Video,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { getActiveCategories, getStoreSettings } from "@/lib/services/storeContentService";
import { storeBusinessHours, storeFooterColumns, whatsappUrl } from "@/lib/storeSettingsDomain";

const linkClass = "text-[11px] text-white/50 transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]";

function FooterLink({ href, label, newTab = false }: { href: string; label: string; newTab?: boolean }) {
  if (/^https?:\/\//i.test(href)) return <a href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noreferrer" : undefined} className={linkClass}>{label}</a>;
  return <Link href={href} className={linkClass}>{label}</Link>;
}

export default async function Footer() {
  const [allCategories, settings] = await Promise.all([getActiveCategories(), getStoreSettings()]);
  const categories = allCategories.filter((category) => category.depth === 0).slice(0, 8);
  const columns = storeFooterColumns(settings.footerColumns).filter((column) => column.ativo);
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
  const marketplaces = [
    settings.shopeeAtivo && settings.linkShopee ? { label: "Shopee", href: settings.linkShopee } : null,
    settings.mercadoLivreAtivo && settings.linkMercadoLivre ? { label: "Mercado Livre", href: settings.linkMercadoLivre } : null,
    settings.tiktokShopAtivo && settings.linkTiktokShop ? { label: "TikTok Shop", href: settings.linkTiktokShop } : null,
    settings.sheinAtivo && settings.linkShein ? { label: "Shein", href: settings.linkShein } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const year = settings.footerCopyrightAno === "fixo" && settings.footerCopyrightAnoFixo
    ? settings.footerCopyrightAnoFixo
    : new Date().getFullYear();

  return (
    <footer className="site-footer border-t border-white/[0.08] bg-[#080808] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.35fr_repeat(5,minmax(0,0.8fr))] lg:px-10 lg:py-12">
        <div>
          <Link href="/" aria-label="Ir para o início" className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]">
            <BrandLogo src={settings.logoUrl} name={settings.nomeLoja} />
          </Link>
          <p className="mt-4 max-w-[270px] text-[11px] leading-5 text-white/50">{settings.descricaoFooter}</p>
          <div className="mt-4 space-y-2 text-[10px] text-white/50">
            {settings.emailSuporteAtivo && settings.emailSuporte ? <a href={`mailto:${settings.emailSuporte}`} className="flex items-center gap-2 transition hover:text-[var(--brand-color)]"><Mail className="h-3.5 w-3.5" />{settings.emailSuporte}</a> : null}
            {settings.telefoneSuporteAtivo && settings.telefoneSuporte ? <a href={`tel:${settings.telefoneSuporte.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 transition hover:text-[var(--brand-color)]"><Phone className="h-3.5 w-3.5" />{settings.telefoneSuporte}</a> : null}
            {whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-2 transition hover:text-[var(--brand-color)]"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a> : null}
          </div>
          <details className="group mt-4 max-w-[270px] rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[10px] text-white/45">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-white/60 [&::-webkit-details-marker]:hidden"><Clock3 className="h-3.5 w-3.5 text-[var(--brand-color)]" /> Horários de atendimento <span className="ml-auto transition group-open:rotate-180">⌄</span></summary>
            <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">{businessHours.map((schedule) => <p key={schedule.dia} className="flex justify-between gap-3"><span>{schedule.label}</span><span className={schedule.ativo ? "text-white/55" : "text-white/25"}>{schedule.ativo ? `${schedule.inicio}–${schedule.fim}` : "Fechado"}</span></p>)}</div>
          </details>
          {socialLinks.length ? <div className="mt-5 flex flex-wrap gap-2">{socialLinks.map(({ label, href, icon: Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/55 transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)]"><Icon className="h-4 w-4" /></a>)}</div> : null}
        </div>

        {columns.slice(0, 4).map((column) => (
          <nav key={column.id} aria-label={column.titulo}>
            <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-white">{column.titulo}</h2>
            <ul className="mt-4 space-y-3">
              {column.tipo === "categorias" ? categories.map((category) => <li key={category.id}><Link href={`/categorias/${category.slug}`} className={linkClass}>{category.nome}</Link></li>) : column.links.filter((link) => link.ativo).map((link) => <li key={link.id}><FooterLink href={link.href} label={link.label} newTab={link.novaAba} /></li>)}
            </ul>
          </nav>
        ))}

        {settings.footerSeloSeguranca || marketplaces.length ? (
          <div>
            {settings.footerSeloSeguranca ? <><h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-white">Compra protegida</h2><div className="mt-4 flex items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4"><ShieldCheck className="h-7 w-7 shrink-0 text-[var(--brand-color)]" strokeWidth={1.5} /><div><strong className="font-display block text-[11px] text-white">Compra segura</strong><span className="mt-1 block text-[10px] leading-4 text-white/45">Ambiente protegido para escolher seus produtos.</span></div></div></> : null}
            {marketplaces.length ? <div className="mt-5 space-y-2"><h3 className="text-[9px] font-bold uppercase tracking-wider text-white/45">Encontre-nos também em</h3>{marketplaces.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-semibold text-white/55 transition hover:text-[var(--brand-color)]"><ShoppingBag className="h-3.5 w-3.5" />{item.label}<ExternalLink className="h-3 w-3" /></a>)}</div> : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-5 text-[10px] text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <div><p>© {year} {settings.nomeLoja.toUpperCase()}. {settings.footerCopyrightTexto}</p>{settings.razaoSocial || settings.cnpjLoja || settings.enderecoEmpresa ? <p className="mt-1 text-[9px] text-white/25">{[settings.razaoSocial, settings.cnpjLoja, settings.enderecoEmpresa].filter(Boolean).join(" · ")}</p> : null}</div>
          <p>{settings.mensagemFooter}</p>
        </div>
      </div>
    </footer>
  );
}
