// CEP "solto" do visitante (header/modal) — conveniência de UX, persistido em
// localStorage. NÃO é endereço de conta: cliente logado usa Address no
// checkout. Mesmo padrão subscribe/snapshot do checkoutShippingStorage, para
// leitura reativa via useSyncExternalStore (server snapshot = null, sem
// hydration mismatch).

const CEP_KEY = "ecomzero:cep-usuario";
const MODAL_DISMISSED_KEY = "ecomzero:cep-modal-dispensado";
// UF resolvida a partir do CEP (ex.: "SP"). Usada pela Barra de Anúncio para
// segmentar mensagens por região sem reconsultar o CEP a cada página.
const UF_KEY = "ecomzero:uf-usuario";

const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

export function subscribeUserCep(listener: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === CEP_KEY || event.key === MODAL_DISMISSED_KEY || event.key === UF_KEY) listener();
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

export function getUserUfSnapshot(): string | null {
  return window.localStorage.getItem(UF_KEY);
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

export function saveUserUf(uf: string): void {
  window.localStorage.setItem(UF_KEY, uf.trim().toUpperCase());
  emitChange();
}

function clearUserUf(): void {
  window.localStorage.removeItem(UF_KEY);
  emitChange();
}

// Ponto único de captura de CEP "solto" (modal/header): salva o CEP, descarta a
// UF anterior (evita região obsoleta) e resolve a nova UF reaproveitando a rota
// de CEP já existente (/api/address/cep). Se a consulta falhar, a UF fica ausente
// — de propósito: mensagens restritas por região não aparecem sem UF confiável.
export async function captureUserCep(value: string): Promise<void> {
  saveUserCep(value);
  clearUserUf();
  const cep = sanitizeCep(value);
  if (!isValidCep(cep)) return;
  try {
    const response = await fetch(`/api/address/cep/${cep}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const data = (await response.json().catch(() => null)) as { uf?: string } | null;
    if (data?.uf) saveUserUf(data.uf);
  } catch {
    // Rede indisponível: mantém sem UF (fail-safe).
  }
}
