export function isDeliveredOrder(shipment: {
  status: string;
  labelStatus: string;
  entregueEm: Date | null;
} | null): boolean {
  return Boolean(
    shipment &&
      (shipment.status === "delivered" ||
        shipment.labelStatus === "delivered" ||
        shipment.entregueEm),
  );
}

export function buildAggregateRating(
  average: number | null,
  count: number,
) {
  if (average === null || count < 1 || !Number.isFinite(average)) return null;

  return {
    "@type": "AggregateRating" as const,
    ratingValue: Number(average.toFixed(1)),
    reviewCount: count,
  };
}
