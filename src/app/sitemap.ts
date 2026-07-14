import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/services/productService";

const siteUrl = "https://www.ecomzero.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
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
