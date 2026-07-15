import { notFound } from "next/navigation";
import ThermalLabelPrint from "@/components/pedidos/ThermalLabelPrint";
import { getAdminOrderDetails } from "@/lib/services/shippingFulfillmentAdminService";

export const dynamic = "force-dynamic";

export default async function ThermalLabelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoprint?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const order = await getAdminOrderDetails(id);
  if (!order?.shipment?.melhorEnvioId) notFound();

  return <ThermalLabelPrint orderId={id} autoPrint={query.autoprint === "1"} />;
}
