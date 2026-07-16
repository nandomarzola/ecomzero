"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Save, UserRound } from "lucide-react";
import { toast } from "sonner";

type AccountProfileFormProps = {
  profile: {
    nome: string | null;
    email: string;
    telefone: string | null;
  };
};

const inputClassName =
  "h-12 w-full rounded-md border border-white/[0.14] bg-[#080808] px-4 text-sm text-white outline-none transition placeholder:text-white/30 hover:border-white/25 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)] disabled:cursor-not-allowed disabled:opacity-50";

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export default function AccountProfileForm({ profile }: AccountProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(profile.nome ?? "");
  const [phone, setPhone] = useState(formatPhone(profile.telefone ?? ""));
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: name, telefone: phone }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível salvar seus dados.");

      toast.success("Dados atualizados com sucesso.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar seus dados.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("A confirmação não corresponde à nova senha.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual: currentPassword, senhaNova: newPassword }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível alterar a senha.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={saveProfile} className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)]">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Dados pessoais</h3>
            <p className="mt-1 text-[11px] text-white/45">Informações usadas para identificar sua conta.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-white/75 sm:col-span-2">
            Nome completo
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              className={`${inputClassName} mt-2`}
            />
          </label>
          <label className="block text-xs font-semibold text-white/75">
            E-mail
            <input value={profile.email} disabled className={`${inputClassName} mt-2`} />
          </label>
          <label className="block text-xs font-semibold text-white/75">
            Celular
            <input
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value))}
              inputMode="tel"
              autoComplete="tel"
              placeholder="(00) 90000-0000"
              maxLength={15}
              className={`${inputClassName} mt-2`}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isSavingProfile}
          className="font-display mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--brand-color)] px-6 text-[10px] font-extrabold uppercase text-black transition hover:bg-[#B8FF28] disabled:cursor-wait disabled:opacity-60"
        >
          {isSavingProfile ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSavingProfile ? "Salvando" : "Salvar dados"}
        </button>
      </form>

      <form onSubmit={savePassword} className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)]">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Alterar senha</h3>
            <p className="mt-1 text-[11px] text-white/45">Use pelo menos 8 caracteres, incluindo número e símbolo.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {[
            { label: "Senha atual", value: currentPassword, setter: setCurrentPassword, autoComplete: "current-password" },
            { label: "Nova senha", value: newPassword, setter: setNewPassword, autoComplete: "new-password" },
            { label: "Confirmar nova senha", value: confirmPassword, setter: setConfirmPassword, autoComplete: "new-password" },
          ].map((field) => (
            <label key={field.label} className="block text-xs font-semibold text-white/75">
              {field.label}
              <div className="relative mt-2">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={field.value}
                  onChange={(event) => {
                    field.setter(event.target.value);
                    setPasswordError("");
                  }}
                  required
                  autoComplete={field.autoComplete}
                  className={`${inputClassName} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((current) => !current)}
                  aria-label={showPasswords ? "Ocultar senhas" : "Mostrar senhas"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/45 transition hover:text-[var(--brand-color)]"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          ))}
        </div>

        {passwordError && (
          <p role="alert" className="mt-4 rounded-md border border-red-400/25 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200">
            {passwordError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSavingPassword}
          className="font-display mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--brand-color)]/60 px-6 text-[10px] font-extrabold uppercase text-[var(--brand-color)] transition hover:bg-[var(--brand-color)] hover:text-black disabled:cursor-wait disabled:opacity-60"
        >
          {isSavingPassword && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {isSavingPassword ? "Alterando" : "Alterar senha"}
        </button>
      </form>
    </div>
  );
}
