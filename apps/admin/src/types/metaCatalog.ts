export type MetaCatalogAdminSettings = {
  feedActive: boolean;
  includeOutOfStock: boolean;
  includeSalePrice: boolean;
  includeAdditionalImages: boolean;
  defaultBrand: string;
  defaultCategory: string;
  lastValidatedAt: string | null;
};

export type MetaCatalogIssue = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string | null;
  field: string;
  reason: string;
  recommendation: string;
  severity: "error" | "warning";
};

export type MetaCatalogItem = {
  rowId: string;
  productId: string;
  productSlug: string;
  variantId: string | null;
  metaId: string | null;
  itemGroupId: string | null;
  title: string;
  description: string;
  link: string | null;
  imageLink: string | null;
  additionalImageLinks: string[];
  sku: string | null;
  kind: "product" | "variant";
  category: string;
  googleProductCategory: string | null;
  availability: "in stock" | "out of stock";
  quantity: number | null;
  price: number | null;
  salePrice: number | null;
  brand: string | null;
  mpn: string | null;
  gtin: string | null;
  included: boolean;
  exclusionReason: string | null;
  issues: MetaCatalogIssue[];
};

export type MetaCatalogReport = {
  generatedAt: string;
  feedUrl: string;
  stockControlled: boolean;
  xmlValid: boolean;
  settings: MetaCatalogAdminSettings & { storeName: string };
  metrics: {
    totalItems: number;
    mainProducts: number;
    variations: number;
    ignoredItems: number;
    ignoredProducts: number;
    warnings: number;
    errors: number;
  };
  items: MetaCatalogItem[];
  problems: MetaCatalogIssue[];
};
