import type { Metadata } from "next";
import { Geist, Montserrat } from "next/font/google";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body
        className={`${geist.variable} ${montserrat.variable} flex min-h-screen flex-col antialiased`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
