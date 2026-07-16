export const FREE_SHIPPING_MINIMUM = 100;

export function qualifiesForFreeShipping(
  subtotal: number,
  couponGrantsFreeShipping = false,
): boolean {
  return couponGrantsFreeShipping || subtotal >= FREE_SHIPPING_MINIMUM;
}
