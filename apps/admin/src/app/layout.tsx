import type { Metadata } from "next";
import { Geist, Inter, Montserrat, Poppins, Roboto } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Admin | EcomZero",
    template: "%s | Admin EcomZero",
  },
  description: "Painel administrativo da loja EcomZero.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${montserrat.variable} ${inter.variable} ${poppins.variable} ${roboto.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
