// CEP "solto" do visitante (header/modal) — conveniência de UX, persistido em
// localStorage. NÃO é endereço de conta: cliente logado usa Address no
// checkout. Mesmo padrão subscribe/snapshot do checkoutShippingStorage, para
// leitura reativa via useSyncExternalStore (server snapshot = null, sem
// hydration mismatch).

const CEP_KEY = "ecomzero:cep-usuario";
const MODAL_DISMISSED_KEY = "ecomzero:cep-modal-dispensado";

const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

export function subscribeUserCep(listener: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === CEP_KEY || event.key === MODAL_DISMISSED_KEY) listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getUserCepSnapshot(): string | null {
  return window.localStorage.getItem(CEP_KEY);
}

export function getCepModalDismissedSnapshot(): string | null {
  return window.localStorage.getItem(MODAL_DISMISSED_KEY);
}

export function sanitizeCep(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCep(value: string): boolean {
  return /^\d{8}$/.test(sanitizeCep(value));
}

// "17521210" → "17521-210" (só formata se já for um CEP válido).
export function formatCep(value: string): string {
  const digits = sanitizeCep(value);
  return /^\d{8}$/.test(digits) ? `${digits.slice(0, 5)}-${digits.slice(5)}` : value;
}

export function saveUserCep(value: string): void {
  window.localStorage.setItem(CEP_KEY, sanitizeCep(value));
  emitChange();
}

export function dismissCepModal(): void {
  window.localStorage.setItem(MODAL_DISMISSED_KEY, "1");
  emitChange();
}
