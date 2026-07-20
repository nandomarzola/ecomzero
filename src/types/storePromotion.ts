export type StorePromotionCoupon = {
  id: string;
  code: string;
  description: string | null;
  type: "percentual" | "valor_fixo" | "frete_gratis";
  value: number | null;
  minimumOrderValue: number | null;
  maximumDiscount: number | null;
  firstPurchase: boolean;
  requiresCustomerIdentity: boolean;
  appliesTo: "toda_loja" | "categoria" | "produto";
  categoryId: string | null;
  productId: string | null;
  eligibleCategoryIds: string[];
  scopeLabel: string;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  exhausted: boolean;
  available: boolean;
};

export type StoreAnnouncementItem = {
  id: string;
  texto: string;
  link: string | null;
  regioesElegiveis: string[];
  coupon: StorePromotionCoupon | null;
};
