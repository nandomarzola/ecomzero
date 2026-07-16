import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { getMelhorEnvioBalance } from "@/lib/services/shippingFulfillmentService";

export async function GET(request: NextRequest) {
  if (
    !config.storefrontSyncApiKey ||
    request.headers.get("authorization") !==
      `Bearer ${config.storefrontSyncApiKey}`
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json(await getMelhorEnvioBalance());
}
