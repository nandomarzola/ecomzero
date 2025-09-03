import type { Metadata } from "next";
import Script from 'next/script';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ECOMZERO",
  description: "Calculadora de precificação para Shopee",
  openGraph: {
    title: "ECOMZERO",
    description: "Calculadora de precificação para Shopee",
    url: "https://www.ecomzero.com.br",
    siteName: "ECOMZERO",
    images: [
      {
        url: "https://www.ecomzero.com.br/ecom.png",
        width: 1200,
        height: 630,
        alt: "Imagem de compartilhamento do ECOMZERO",
      },
    ],
    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-L52TXPMG2P"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-L52TXPMG2P');
          `}
        </Script>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8445617399965497"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Header />
        <main className="min-h-screen ">{children}</main> {/* pb-24 evita sobreposição com o footer */}
        <Footer />
      </body>
    </html>
  );
}
