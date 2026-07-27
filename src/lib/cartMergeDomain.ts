export type CartMergeLine = {
  variantId: string;
  canonicalVariantId: string;
  quantity: number;
};

export type MergedCartLine = {
  variantId: string;
  quantity: number;
};

export function mergeCartLines(
  lines: CartMergeLine[],
  maximumQuantity: number,
): MergedCartLine[] {
  const quantities = new Map<string, number>();

  for (const line of lines) {
    const current = quantities.get(line.canonicalVariantId) ?? 0;
    quantities.set(
      line.canonicalVariantId,
      Math.min(maximumQuantity, current + Math.max(0, line.quantity)),
    );
  }

  return [...quantities.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function selectMergedCouponId(
  couponIdsByPriority: Array<string | null>,
): string | null {
  return couponIdsByPriority.find((couponId) => couponId !== null) ?? null;
}
