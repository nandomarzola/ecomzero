export type CartItem = {
  id: string;
  variantId: string;
  productSlug: string;
  productName: string;
  productImage: string;
  variantLabel: string;
  skuInterno: string | null;
  quantidade: number;
  precoDe: number;
  precoUnitario: number;
  subtotal: number;
};

export type Cart = {
  id: string | null;
  items: CartItem[];
  total: number;
  itemCount: number;
};
