import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Inter, Montserrat, Poppins, Roboto } from "next/font/google";
import { Toaster } from "sonner";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import BottomNav from "@/components/BottomNav";
import CartDrawer from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/CartProvider";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import AnnouncementBar from "@/components/AnnouncementBar";
import { getActiveAnnouncementBarItems, getStoreSettings } from "@/lib/services/storeContentService";
import { ProductFiltersProvider } from "@/components/ProductFiltersProvider";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poppins", display: "swap" });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-roboto", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  const title = `${settings.nomeLoja} | Produtos úteis para o dia a dia`;
  return {
    metadataBase: new URL("https://www.ecomzero.com.br"),
    title: { default: title, template: `%s | ${settings.nomeLoja}` },
    description: settings.descricaoFooter,
    icons: { icon: settings.faviconUrl || settings.logoUrl },
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description: settings.descricaoFooter,
      url: "/",
      siteName: settings.nomeLoja,
      locale: "pt_BR",
      type: "website",
      images: [{ url: settings.logoUrl, alt: settings.nomeLoja }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, announcementItems] = await Promise.all([getStoreSettings(), getActiveAnnouncementBarItems()]);
  const logoUrl = new URL(settings.logoUrl, "https://www.ecomzero.com.br").toString();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.nomeLoja,
    url: "https://www.ecomzero.com.br",
    logo: logoUrl,
    sameAs: [settings.linkShopee, settings.linkInstagram, settings.linkFacebook, settings.linkTiktok].filter(Boolean),
  };
  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.nomeLoja,
    url: "https://www.ecomzero.com.br",
    inLanguage: settings.idioma,
  };
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      data-font-family={settings.fontFamily}
      data-product-card-style={settings.productCardStyle}
      data-card-corner-style={settings.cardCornerStyle}
      data-show-rating={String(settings.showRating)}
      data-show-buy-now={String(settings.showBuyNowButton)}
      data-button-style={settings.buttonStyle}
      suppressHydrationWarning
      style={{ "--brand-color": settings.corPrincipal, "--accent": settings.corPrincipal } as CSSProperties}
    >
      <body
        className={`${geist.variable} ${montserrat.variable} ${inter.variable} ${poppins.variable} ${roboto.variable} flex min-h-screen flex-col antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webSiteJsonLd),
          }}
        />

        <AuthSessionProvider>
          <CartProvider>
            <CartDrawer />
            <ProductFiltersProvider>
              {settings.barraAnuncioAtiva && announcementItems.length ? (
                <AnnouncementBar
                  items={announcementItems}
                  rotationSeconds={settings.barraAnuncioVelocidade}
                  backgroundColor={settings.barraAnuncioCor ?? settings.corPrincipal}
                />
              ) : null}
              <Header logoUrl={settings.logoUrl} storeName={settings.nomeLoja} />

              <main className="flex-1 pb-16 md:pb-0">{children}</main>

              <Footer />

              <BottomNav />
            </ProductFiltersProvider>
          </CartProvider>
        </AuthSessionProvider>

        <Toaster position="top-center" theme="dark" richColors closeButton />
      </body>
    </html>
  );
}
