import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // CSP em REPORT-ONLY: não bloqueia nada ainda — só reporta violações no
  // console do browser. Observar por alguns dias (pixels, Mercado Pago Bricks,
  // inline do Next) antes de trocar o header para "Content-Security-Policy" e
  // remover 'unsafe-inline'.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com https://sdk.mercadopago.com https://*.mercadopago.com",
      "connect-src 'self' https:",
      "frame-src https://*.mercadopago.com https://*.mercadolibre.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
  },
  images: {
    qualities: [75, 90],
    // Imagens de produto cadastradas pelo admin ficam no Vercel Blob (URLs
    // absolutas). Imagens legadas continuam em /public (caminhos relativos).
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
