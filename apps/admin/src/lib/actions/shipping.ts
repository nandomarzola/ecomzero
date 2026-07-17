"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  calculateOrderShipping,
  createMelhorEnvioShipment,
  dismissShipmentError,
  generateMelhorEnvioLabel,
  syncMelhorEnvioTracking,
  updateShippingSettings,
} from "@/lib/services/shippingFulfillmentAdminService";
import {
  attachInvoiceInStorefront,
  cancelShipmentInStorefront,
  confirmFiscalDocumentInStorefront,
  markExternalShipmentInStorefront,
  prepareShipmentInStorefront,
  purchaseShipmentInStorefront,
  syncShipmentInStorefront,
} from "@/lib/services/storefrontShippingAdminClient";
import { z } from "zod";
import {
  adminShippingSelectionSchema,
  createShipmentSchema,
  fiscalDocumentSelectionSchema,
  shippingSettingsSchema,
} from "@/lib/validation/shipping";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function isAuthenticated() {
  return Boolean((await auth())?.user);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

export async function saveShippingSettingsAction(input: unknown): Promise<ActionResult> {
  if (!(await isAuthenticated())) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const parsed = shippingSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await updateShippingSettings(parsed.data);
    revalidatePath("/fretes");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function calculateOrderShippingAction(orderId: string): Promise<ActionResult<Awaited<ReturnType<typeof calculateOrderShipping>>>> {
  if (!(await isAuthenticated())) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  try {
    const quote = await calculateOrderShipping(orderId);
    revalidatePath(`/pedidos/${orderId}`);
    return { ok: true, data: quote };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function createShipmentAction(
  orderId: string,
  input: unknown,
  shippingSelection?: unknown,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const parsed = createShipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Documento fiscal inválido." };
  const parsedSelection = shippingSelection === undefined
    ? undefined
    : adminShippingSelectionSchema.safeParse(shippingSelection);
  if (parsedSelection && !parsedSelection.success) {
    return { ok: false, error: parsedSelection.error.issues[0]?.message ?? "Seleção de frete inválida." };
  }
  try {
    await createMelhorEnvioShipment(orderId, parsed.data, parsedSelection?.data);
    revalidatePath(`/pedidos/${orderId}`);
    revalidatePath("/pedidos");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

async function runShipmentAction(
  orderId: string,
  action: (id: string) => Promise<unknown>,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  try {
    await action(orderId);
    revalidatePath(`/pedidos/${orderId}`);
    revalidatePath("/pedidos");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function purchaseShipmentAction(orderId: string) {
  return runShipmentAction(orderId, purchaseShipmentInStorefront);
}

export async function prepareShipmentAction(orderId: string, serviceId?: string) {
  return runShipmentAction(orderId, (id) => prepareShipmentInStorefront(id, serviceId));
}

export async function attachInvoiceAction(orderId: string, input: unknown) {
  if (!(await isAuthenticated())) {
    return { ok: false as const, error: "Sessão expirada. Faça login novamente." };
  }
  const parsed = z
    .object({ invoiceKey: z.string().regex(/^\d{44}$/, "A chave da NF-e deve possuir exatamente 44 dígitos.") })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Chave da NF-e inválida." };
  }
  try {
    await attachInvoiceInStorefront(orderId, parsed.data.invoiceKey);
    revalidatePath(`/pedidos/${orderId}`);
    revalidatePath("/pedidos");
    return { ok: true as const, data: undefined };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}

export async function confirmFiscalDocumentAction(orderId: string, input: unknown) {
  if (!(await isAuthenticated())) {
    return { ok: false as const, error: "Sessão expirada. Faça login novamente." };
  }
  const parsed = fiscalDocumentSelectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Documento fiscal inválido." };
  }
  try {
    await confirmFiscalDocumentInStorefront(orderId, parsed.data);
    revalidatePath(`/pedidos/${orderId}`);
    revalidatePath("/pedidos");
    return { ok: true as const, data: undefined };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}

export async function markExternalShipmentAction(orderId: string) {
  return runShipmentAction(orderId, markExternalShipmentInStorefront);
}

export async function syncShipmentStatusAction(orderId: string) {
  return runShipmentAction(orderId, syncShipmentInStorefront);
}

export async function cancelShipmentAction(orderId: string) {
  return runShipmentAction(orderId, cancelShipmentInStorefront);
}

export async function generateLabelAction(orderId: string) {
  return runShipmentAction(orderId, generateMelhorEnvioLabel);
}

export async function syncTrackingAction(orderId: string) {
  return runShipmentAction(orderId, syncMelhorEnvioTracking);
}

export async function dismissShipmentErrorAction(orderId: string) {
  return runShipmentAction(orderId, dismissShipmentError);
}
