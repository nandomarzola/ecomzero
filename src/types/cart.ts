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

export type AppliedCartCoupon = {
  code: string;
  tipo: "percentual" | "valor_fixo" | "frete_gratis";
  freeShipping: boolean;
};

export type Cart = {
  id: string | null;
  items: CartItem[];
  /** soma dos itens (produtos), sem frete nem desconto */
  subtotal: number;
  /** desconto do cupom sobre os produtos (frete_gratis = 0 aqui; frete é zerado no checkout) */
  discount: number;
  /** subtotal - discount */
  total: number;
  itemCount: number;
  coupon: AppliedCartCoupon | null;
};
