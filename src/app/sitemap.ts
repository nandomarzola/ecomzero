import type { MetadataRoute } from "next";
import products from "@/data/produtos.json";

const siteUrl = "https://www.ecomzero.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/produto/${product.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...productEntries,
  ];
}
