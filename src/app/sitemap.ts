import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/services/productService";
import { getActiveCategories } from "@/lib/services/storeContentService";

const siteUrl = "https://www.ecomzero.com.br";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getAllProducts(), getActiveCategories()]);

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/produto/${product.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Caminho de slugs de cada categoria (raiz ou raiz/sub) para a URL canônica.
  const byId = new Map(categories.map((category) => [category.id, category]));
  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => {
    const slugs = [category.slug];
    let parentId = category.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) break;
      slugs.unshift(parent.slug);
      parentId = parent.parentId;
    }
    return {
      url: `${siteUrl}/categorias/${slugs.join("/")}`,
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...categoryEntries,
    ...productEntries,
  ];
}
