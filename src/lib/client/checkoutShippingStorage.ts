export type CheckoutShippingSelection = {
  quoteId: string;
  optionId: string;
  cep: string;
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
  expiresAt: string;
  cartSubtotal: number;
};

const STORAGE_KEY = "ecomzero_checkout_shipping";
const listeners = new Set<() => void>();

function isCheckoutShippingSelection(
  value: unknown,
): value is CheckoutShippingSelection {
  if (!value || typeof value !== "object") return false;
  const selection = value as Record<string, unknown>;
  return (
    typeof selection.quoteId === "string" &&
    typeof selection.optionId === "string" &&
    typeof selection.cep === "string" &&
    typeof selection.transportadora === "string" &&
    typeof selection.servico === "string" &&
    typeof selection.preco === "number" &&
    Number.isFinite(selection.preco) &&
    typeof selection.prazoDias === "number" &&
    Number.isFinite(selection.prazoDias) &&
    typeof selection.expiresAt === "string" &&
    Number.isFinite(Date.parse(selection.expiresAt)) &&
    typeof selection.cartSubtotal === "number" &&
    Number.isFinite(selection.cartSubtotal)
  );
}

function emitStorageChange(): void {
  for (const listener of listeners) listener();
}

export function subscribeCheckoutShippingSelection(
  listener: () => void,
): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getCheckoutShippingSnapshot(): string | null {
  return window.sessionStorage.getItem(STORAGE_KEY);
}

export function parseCheckoutShippingSelection(
  raw: string | null,
): CheckoutShippingSelection | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isCheckoutShippingSelection(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getCheckoutShippingSelection(): CheckoutShippingSelection | null {
  try {
    return parseCheckoutShippingSelection(getCheckoutShippingSnapshot());
  } catch {
    return null;
  }
}

export function saveCheckoutShippingSelection(
  selection: CheckoutShippingSelection,
): void {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  emitStorageChange();
}

export function clearCheckoutShippingSelection(): void {
  window.sessionStorage.removeItem(STORAGE_KEY);
  emitStorageChange();
}

export function isCheckoutShippingExpired(
  selection: CheckoutShippingSelection,
  now = Date.now(),
): boolean {
  return Date.parse(selection.expiresAt) <= now;
}
