import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.ecomzero.com.br" },
      { protocol: "https", hostname: "ecomzero.com.br" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "http", hostname: "localhost", port: "3000" },
    ],
  },
};

export default nextConfig;
