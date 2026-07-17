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
