import type { Metadata, Viewport } from "next";
import { Geist, Montserrat } from "next/font/google";
import { Toaster } from "sonner";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import BottomNav from "@/components/BottomNav";
import { CartProvider } from "@/components/CartProvider";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import AnnouncementBar from "@/components/AnnouncementBar";
import { getStoreSettings } from "@/lib/services/storeContentService";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ecomzero.com.br"),
  title: {
    default: "EcomZero | Produtos úteis para o dia a dia",
    template: "%s | EcomZero",
  },
  description:
    "Conheça os produtos da EcomZero e finalize sua compra com segurança na loja oficial da Shopee.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "EcomZero | Produtos úteis para o dia a dia",
    description:
      "Conheça os produtos da EcomZero e finalize sua compra com segurança na loja oficial da Shopee.",
    url: "/",
    siteName: "EcomZero",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/produtos/lampada-led.jpg",
        width: 1024,
        height: 1024,
        alt: "Lâmpada LED Recarregável 20W USB Super Forte",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "EcomZero",
  url: "https://www.ecomzero.com.br",
  logo: "https://www.ecomzero.com.br/images/logo2.png",
  sameAs: ["https://shopee.com.br/shop/611286890"],
};

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "EcomZero",
  url: "https://www.ecomzero.com.br",
  inLanguage: "pt-BR",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getStoreSettings();
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className={`${geist.variable} ${montserrat.variable} flex min-h-screen flex-col antialiased`}
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
            <ProductFiltersProvider>
              {settings.barraAnuncioAtiva && settings.barraAnuncioTexto ? <AnnouncementBar text={settings.barraAnuncioTexto} href={settings.barraAnuncioLink} /> : null}
              <Header />

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
