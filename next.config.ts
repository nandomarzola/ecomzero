import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
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
