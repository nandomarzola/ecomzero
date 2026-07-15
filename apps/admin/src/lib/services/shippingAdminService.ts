import { config } from "@/lib/config";
import { prisma } from "@/lib/db";

export type ShippingIntegrationStatus = {
  provider: "Melhor Envio";
  configured: boolean;
  environment: "Sandbox" | "Produção" | "Não informado";
  originCep: string | null;
  expiresAt: string | null;
  expired: boolean;
  updatedAt: string | null;
};

export async function getShippingIntegrationStatus(): Promise<ShippingIntegrationStatus> {
  const credential = await prisma.melhorEnvioCredential.findUnique({
    where: { id: "singleton" },
    select: { expiraEm: true, atualizadoEm: true },
  });
  const baseUrl = config.melhorEnvioBaseUrl?.toLowerCase();
  return {
    provider: "Melhor Envio",
    configured: Boolean(credential),
    environment: credential ? "Produção" : baseUrl?.includes("sandbox") ? "Sandbox" : baseUrl ? "Produção" : "Não informado",
    originCep: config.melhorEnvioCepOrigem?.replace(/\D/g, "") ?? null,
    expiresAt: credential?.expiraEm.toISOString() ?? null,
    expired: credential ? credential.expiraEm <= new Date() : false,
    updatedAt: credential?.atualizadoEm.toISOString() ?? null,
  };
}
