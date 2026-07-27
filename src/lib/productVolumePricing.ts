export type VolumePriceVariant = {
  id: string;
  label: string;
  precoDe: number;
  precoPor: number;
};

export type VolumePriceTier = {
  quantity: number;
  variantId: string;
  listUnitPrice: number;
  unitPrice: number;
};

export type VolumePricing = {
  canonicalVariantId: string;
  tiers: VolumePriceTier[];
};

const quantityLabelPattern = /^(\d+)\s+UNIDADES?$/i;

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const bundleTotalToUnitPrice = (total: number, quantity: number) =>
  Math.round(Math.round(total * 100) / quantity) / 100;

export function getVolumePricing(
  variants: VolumePriceVariant[],
): VolumePricing | null {
  if (variants.length < 2) return null;

  const tiers = variants.flatMap((variant) => {
    const match = quantityLabelPattern.exec(variant.label.trim());
    if (!match) return [];

    const quantity = Number(match[1]);
    if (!Number.isSafeInteger(quantity) || quantity < 1) return [];

    return [{
      quantity,
      variantId: variant.id,
      listUnitPrice: bundleTotalToUnitPrice(variant.precoDe, quantity),
      unitPrice: bundleTotalToUnitPrice(variant.precoPor, quantity),
    }];
  });

  if (tiers.length !== variants.length) return null;

  tiers.sort((left, right) => left.quantity - right.quantity);
  if (tiers[0]?.quantity !== 1) return null;
  if (new Set(tiers.map((tier) => tier.quantity)).size !== tiers.length) {
    return null;
  }

  return {
    canonicalVariantId: tiers[0].variantId,
    tiers,
  };
}

export function getVolumePriceForQuantity(
  variants: VolumePriceVariant[],
  quantity: number,
) {
  const pricing = getVolumePricing(variants);
  if (!pricing) return null;

  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  const tier = pricing.tiers.reduce(
    (current, candidate) =>
      candidate.quantity <= normalizedQuantity ? candidate : current,
    pricing.tiers[0],
  );

  return {
    ...pricing,
    activeTier: tier,
    quantity: normalizedQuantity,
    listUnitPrice: tier.listUnitPrice,
    unitPrice: tier.unitPrice,
    total: roundMoney(tier.unitPrice * normalizedQuantity),
  };
}
