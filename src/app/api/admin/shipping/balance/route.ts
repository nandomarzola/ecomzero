import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { safeCompare } from "@/lib/security/safeCompare";
import { getMelhorEnvioBalance } from "@/lib/services/shippingFulfillmentService";

export async function GET(request: NextRequest) {
  if (
    !config.storefrontSyncApiKey ||
    !safeCompare(
      request.headers.get("authorization"),
      `Bearer ${config.storefrontSyncApiKey}`,
    )
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json(await getMelhorEnvioBalance());
}
