"use client";

import { FormEvent, useState } from "react";
import { Home, LoaderCircle, MapPin, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export type AccountAddress = {
  id: string;
  apelido: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  padrao: boolean;
};

type AddressForm = {
  apelido: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  padrao: boolean;
};

const emptyForm: AddressForm = {
  apelido: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  padrao: false,
};

const inputClassName =
  "h-11 w-full rounded-md border border-white/[0.14] bg-[#080808] px-3 text-sm text-white outline-none transition placeholder:text-white/28 hover:border-white/25 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)] disabled:cursor-wait disabled:opacity-60";

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

const sortAddresses = (addresses: AccountAddress[]) =>
  [...addresses].sort((first, second) => Number(second.padrao) - Number(first.padrao));

export default function AccountAddressManager({ initialAddresses }: { initialAddresses: AccountAddress[] }) {
  const [addresses, setAddresses] = useState(sortAddresses(initialAddresses));
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(initialAddresses.length === 0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);
  const [busyAddressId, setBusyAddressId] = useState<string | null>(null);

  const updateField = <Key extends keyof AddressForm>(field: Key, value: AddressForm[Key]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openNewAddress = () => {
    setEditingId(null);
    setForm({ ...emptyForm, padrao: addresses.length === 0 });
    setIsFormOpen(true);
  };

  const editAddress = (address: AccountAddress) => {
    setEditingId(address.id);
    setForm({
      apelido: address.apelido ?? "",
      cep: formatCep(address.cep),
      logradouro: address.logradouro,
      numero: address.numero,
      complemento: address.complemento ?? "",
      bairro: address.bairro,
      cidade: address.cidade,
      uf: address.uf,
      padrao: address.padrao,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  };

  const lookupCep = async () => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      toast.error("Informe um CEP válido com 8 números.");
      return;
    }

    setIsLookingUpCep(true);
    try {
      const response = await fetch(`/api/address/cep/${cep}`);
      const data = (await response.json().catch(() => null)) as
        | { logradouro?: string; bairro?: string; cidade?: string; uf?: string; error?: string }
        | null;
      if (!response.ok || !data) throw new Error(data?.error ?? "Não foi possível consultar o CEP.");

      setForm((current) => ({
        ...current,
        logradouro: data.logradouro ?? current.logradouro,
        bairro: data.bairro ?? current.bairro,
        cidade: data.cidade ?? current.cidade,
        uf: data.uf ?? current.uf,
      }));
      toast.success("CEP encontrado. Confira o endereço.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível consultar o CEP.");
    } finally {
      setIsLookingUpCep(false);
    }
  };

  const saveAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(
        editingId ? `/api/account/addresses/${editingId}` : "/api/account/addresses",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, cep: form.cep.replace(/\D/g, "") }),
        },
      );
      const data = (await response.json().catch(() => null)) as (AccountAddress & { error?: string }) | null;
      if (!response.ok || !data) throw new Error(data?.error ?? "Não foi possível salvar o endereço.");

      setAddresses((current) => {
        const normalized = data.padrao ? current.map((address) => ({ ...address, padrao: false })) : current;
        const next = editingId
          ? normalized.map((address) => (address.id === editingId ? data : address))
          : [...normalized, data];
        return sortAddresses(next);
      });
      closeForm();
      toast.success(editingId ? "Endereço atualizado." : "Endereço adicionado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o endereço.");
    } finally {
      setIsSaving(false);
    }
  };

  const makeDefault = async (addressId: string) => {
    setBusyAddressId(addressId);
    try {
      const response = await fetch(`/api/account/addresses/${addressId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ padrao: true }),
      });
      const data = (await response.json().catch(() => null)) as (AccountAddress & { error?: string }) | null;
      if (!response.ok || !data) throw new Error(data?.error ?? "Não foi possível alterar o endereço padrão.");

      setAddresses((current) =>
        sortAddresses(current.map((address) => ({ ...address, padrao: address.id === addressId }))),
      );
      toast.success("Endereço padrão atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o endereço padrão.");
    } finally {
      setBusyAddressId(null);
    }
  };

  const removeAddress = async (addressId: string) => {
    if (!window.confirm("Deseja excluir este endereço?")) return;

    setBusyAddressId(addressId);
    try {
      const response = await fetch(`/api/account/addresses/${addressId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Não foi possível excluir o endereço.");
      }
      setAddresses((current) => current.filter((address) => address.id !== addressId));
      if (editingId === addressId) closeForm();
      toast.success("Endereço excluído.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o endereço.");
    } finally {
      setBusyAddressId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openNewAddress}
          className="store-primary-action font-display inline-flex min-h-11 items-center justify-center gap-2 px-5 text-[10px] font-extrabold uppercase transition"
        >
          <Plus className="h-4 w-4" />
          Novo endereço
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={saveAddress} className="rounded-xl border border-[var(--brand-color)]/25 bg-[#0D0D0D] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <h3 className="font-display text-lg font-bold text-white">
              {editingId ? "Editar endereço" : "Adicionar endereço"}
            </h3>
            <button type="button" onClick={closeForm} aria-label="Fechar formulário" className="text-white/45 transition hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-white/70">
              Apelido
              <input value={form.apelido} onChange={(event) => updateField("apelido", event.target.value)} placeholder="Casa, trabalho..." maxLength={40} className={`${inputClassName} mt-2`} />
            </label>
            <label className="text-xs font-semibold text-white/70">
              CEP
              <div className="mt-2 flex gap-2">
                <input value={form.cep} onChange={(event) => updateField("cep", formatCep(event.target.value))} inputMode="numeric" required maxLength={9} placeholder="00000-000" className={inputClassName} />
                <button type="button" onClick={lookupCep} disabled={isLookingUpCep} aria-label="Buscar CEP" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--brand-color)]/50 text-[var(--brand-color)] transition hover:bg-[var(--brand-color)]/10 disabled:opacity-50">
                  {isLookingUpCep ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="text-xs font-semibold text-white/70 sm:col-span-2">
              Logradouro
              <input value={form.logradouro} onChange={(event) => updateField("logradouro", event.target.value)} required maxLength={160} autoComplete="address-line1" className={`${inputClassName} mt-2`} />
            </label>
            <label className="text-xs font-semibold text-white/70">
              Número
              <input value={form.numero} onChange={(event) => updateField("numero", event.target.value)} required maxLength={20} className={`${inputClassName} mt-2`} />
            </label>
            <label className="text-xs font-semibold text-white/70">
              Complemento
              <input value={form.complemento} onChange={(event) => updateField("complemento", event.target.value)} maxLength={100} autoComplete="address-line2" className={`${inputClassName} mt-2`} />
            </label>
            <label className="text-xs font-semibold text-white/70">
              Bairro
              <input value={form.bairro} onChange={(event) => updateField("bairro", event.target.value)} required maxLength={100} className={`${inputClassName} mt-2`} />
            </label>
            <label className="text-xs font-semibold text-white/70">
              Cidade
              <input value={form.cidade} onChange={(event) => updateField("cidade", event.target.value)} required maxLength={100} autoComplete="address-level2" className={`${inputClassName} mt-2`} />
            </label>
            <label className="text-xs font-semibold text-white/70">
              UF
              <input value={form.uf} onChange={(event) => updateField("uf", event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2))} required minLength={2} maxLength={2} autoComplete="address-level1" className={`${inputClassName} mt-2 uppercase`} />
            </label>
            <label className="flex items-center gap-3 self-end pb-3 text-xs text-white/65">
              <input type="checkbox" checked={form.padrao} onChange={(event) => updateField("padrao", event.target.checked)} className="h-5 w-5 accent-[var(--brand-color)]" />
              Usar como endereço padrão
            </label>
          </div>

          <button type="submit" disabled={isSaving} className="store-primary-action font-display mt-6 inline-flex min-h-11 items-center justify-center gap-2 px-6 text-[10px] font-extrabold uppercase transition disabled:cursor-wait disabled:opacity-60">
            {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isSaving ? "Salvando" : "Salvar endereço"}
          </button>
        </form>
      )}

      {addresses.length === 0 && !isFormOpen ? (
        <div className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] px-6 py-12 text-center">
          <MapPin className="mx-auto h-11 w-11 text-[var(--brand-color)]" strokeWidth={1.5} />
          <h3 className="font-display mt-4 text-lg font-bold text-white">Nenhum endereço salvo</h3>
          <p className="mt-2 text-sm text-white/45">Adicione um endereço para agilizar suas próximas compras.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <article key={address.id} className={`rounded-xl border bg-[#0D0D0D] p-5 ${address.padrao ? "border-[var(--brand-color)]/35" : "border-white/[0.1]"}`}>
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-[var(--brand-color)]">
                  <Home className="h-5 w-5" />
                </span>
                {address.padrao && (
                  <span className="rounded-full border border-[var(--brand-color)]/25 bg-[var(--brand-color)]/[0.08] px-2.5 py-1 text-[8px] font-bold uppercase text-[#D5FF7B]">Padrão</span>
                )}
              </div>
              <h3 className="font-display mt-4 text-sm font-bold text-white">{address.apelido || "Endereço"}</h3>
              <p className="mt-2 text-xs leading-5 text-white/50">
                {address.logradouro}, {address.numero}
                {address.complemento ? ` · ${address.complemento}` : ""}
                <br />
                {address.bairro} · {address.cidade}/{address.uf}
                <br />CEP {formatCep(address.cep)}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
                {!address.padrao && (
                  <button type="button" onClick={() => makeDefault(address.id)} disabled={busyAddressId === address.id} className="inline-flex min-h-9 items-center gap-1.5 rounded border border-white/15 px-3 text-[9px] font-semibold text-white/55 transition hover:border-[var(--brand-color)]/50 hover:text-[var(--brand-color)] disabled:opacity-50">
                    <Star className="h-3.5 w-3.5" /> Padrão
                  </button>
                )}
                <button type="button" onClick={() => editAddress(address)} disabled={busyAddressId === address.id} className="inline-flex min-h-9 items-center gap-1.5 rounded border border-white/15 px-3 text-[9px] font-semibold text-white/55 transition hover:border-white/30 hover:text-white disabled:opacity-50">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button type="button" onClick={() => removeAddress(address.id)} disabled={busyAddressId === address.id} className="inline-flex min-h-9 items-center gap-1.5 rounded border border-red-300/15 px-3 text-[9px] font-semibold text-red-200/60 transition hover:border-red-300/35 hover:text-red-200 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
