"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";
import {
  beginAdminTwoFactorSetupAction,
  changeAdminPasswordAction,
  disableAdminTwoFactorAction,
  enableAdminTwoFactorAction,
  regenerateAdminRecoveryCodesAction,
  revokeAdminSessionsAction,
} from "@/lib/actions/adminSecurity";

export type AdminSecurityStatus = {
  role: "owner" | "staff";
  twoFactorEnabled: boolean;
  twoFactorEnabledAt: string | null;
  recoveryCodesRemaining: number;
};

type SetupState = {
  secret: string;
  setupToken: string;
  qrCodeDataUrl: string;
};

const inputClass = "h-10 rounded-md border border-white/[0.09] bg-[#090909] px-3 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-[#A9EC17]/45";
const primaryButton = "inline-flex h-9 items-center gap-2 rounded-md bg-[#A9EC17] px-4 text-[10px] font-bold text-black transition hover:brightness-110 disabled:opacity-45";

export default function SecuritySettingsSection({
  initialStatus,
  setupRequired = false,
}: {
  initialStatus: AdminSecurityStatus;
  setupRequired?: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [protectedPassword, setProtectedPassword] = useState("");
  const [protectedCode, setProtectedCode] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function finishWithReauthentication(messageText: string) {
    setMessage({ type: "success", text: messageText });
    window.setTimeout(() => signOut({ redirectTo: "/login" }), 900);
  }

  function changePassword() {
    setMessage(null);
    startTransition(async () => {
      const result = await changeAdminPasswordAction({ currentPassword, newPassword, confirmPassword });
      if (!result.ok) return setMessage({ type: "error", text: result.error });
      finishWithReauthentication("Senha alterada. Encerrando as sessões antigas…");
    });
  }

  function beginSetup() {
    setMessage(null);
    startTransition(async () => {
      const result = await beginAdminTwoFactorSetupAction({ currentPassword: setupPassword });
      if (!result.ok) return setMessage({ type: "error", text: result.error });
      setSetup({ secret: result.secret, setupToken: result.setupToken, qrCodeDataUrl: result.qrCodeDataUrl });
      setMessage({ type: "success", text: "Escaneie o QR Code e confirme com o código atual." });
    });
  }

  function enableTwoFactor() {
    if (!setup) return;
    setMessage(null);
    startTransition(async () => {
      const result = await enableAdminTwoFactorAction({ setupToken: setup.setupToken, code: setupCode });
      if (!result.ok) return setMessage({ type: "error", text: result.error });
      setRecoveryCodes(result.recoveryCodes);
      setStatus((current) => ({ ...current, twoFactorEnabled: true, recoveryCodesRemaining: result.recoveryCodes.length }));
      setSetup(null);
      setSetupPassword("");
      setSetupCode("");
      setMessage({ type: "success", text: "2FA ativado. Salve os códigos antes de entrar novamente." });
    });
  }

  function regenerateRecoveryCodes() {
    setMessage(null);
    startTransition(async () => {
      const result = await regenerateAdminRecoveryCodesAction({ currentPassword: protectedPassword, code: protectedCode });
      if (!result.ok) return setMessage({ type: "error", text: result.error });
      setRecoveryCodes(result.recoveryCodes);
      setStatus((current) => ({ ...current, recoveryCodesRemaining: result.recoveryCodes.length }));
      setProtectedPassword("");
      setProtectedCode("");
      setMessage({ type: "success", text: "Novos códigos gerados. Os anteriores não funcionam mais." });
    });
  }

  function disableTwoFactor() {
    setMessage(null);
    startTransition(async () => {
      const result = await disableAdminTwoFactorAction({ currentPassword: protectedPassword, code: protectedCode });
      if (!result.ok) return setMessage({ type: "error", text: result.error });
      finishWithReauthentication("2FA desativado. Será necessário configurá-lo novamente para usar o painel.");
    });
  }

  function revokeSessions() {
    setMessage(null);
    startTransition(async () => {
      const result = await revokeAdminSessionsAction({ currentPassword: sessionPassword });
      if (!result.ok) return setMessage({ type: "error", text: result.error });
      finishWithReauthentication("Todas as sessões foram revogadas.");
    });
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage({ type: "success", text: "Copiado para a área de transferência." });
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-[15px] font-bold text-white">Segurança administrativa</h2>
          <span className="rounded-full border border-[#A9EC17]/20 bg-[#A9EC17]/[0.06] px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-[#D9FF87]">
            {status.role === "owner" ? "Proprietário" : "Equipe"}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-white/38">Sessões revogáveis, senha forte e autenticação TOTP obrigatória.</p>
      </header>

      {setupRequired && !status.twoFactorEnabled ? (
        <div className="rounded-md border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-[10px] leading-5 text-amber-100/80">
          Configure o autenticador para liberar o restante do painel. Enquanto o 2FA estiver inativo, nenhuma ação administrativa é autorizada no servidor.
        </div>
      ) : null}

      {message ? (
        <p role={message.type === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-[10px] ${message.type === "success" ? "border-[#A9EC17]/20 bg-[#A9EC17]/[0.05] text-[#D9FF87]" : "border-red-400/20 bg-red-400/[0.06] text-red-200"}`}>
          {message.text}
        </p>
      ) : null}

      <section className="rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#A9EC17]/10 text-[#A9EC17]"><Smartphone className="h-4 w-4" /></span>
          <div>
            <h3 className="text-[10px] font-semibold text-white/70">Autenticação em dois fatores</h3>
            <p className="mt-1 text-[9px] leading-4 text-white/30">Compatível com Google Authenticator, Microsoft Authenticator, 1Password e outros aplicativos TOTP.</p>
          </div>
        </div>

        {!status.twoFactorEnabled && !recoveryCodes ? (
          <div className="mt-4 space-y-4">
            {!setup ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1.5 text-[10px] text-white/55">Confirme sua senha<input type="password" autoComplete="current-password" value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} className={inputClass} /></label>
                <button type="button" onClick={beginSetup} disabled={pending || !setupPassword} className={primaryButton}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Configurar 2FA</button>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-[240px_1fr]">
                <Image src={setup.qrCodeDataUrl} alt="QR Code para configurar o autenticador" width={240} height={240} unoptimized className="rounded-md bg-white" />
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold text-white/70">1. Escaneie o QR Code</p>
                    <p className="mt-1 text-[9px] leading-4 text-white/35">Se não puder escanear, cadastre manualmente a chave abaixo.</p>
                    <button type="button" onClick={() => copyText(setup.secret)} className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md border border-white/10 bg-[#090909] px-3 py-2 font-mono text-[10px] tracking-wider text-white/70"><span className="truncate">{setup.secret}</span><Copy className="h-3.5 w-3.5 shrink-0" /></button>
                  </div>
                  <label className="flex flex-col gap-1.5 text-[10px] text-white/55">2. Código de 6 dígitos<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={setupCode} onChange={(event) => setSetupCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={inputClass} /></label>
                  <button type="button" onClick={enableTwoFactor} disabled={pending || setupCode.length !== 6} className={primaryButton}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Confirmar e ativar</button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {status.twoFactorEnabled && !recoveryCodes ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#A9EC17]/15 bg-[#A9EC17]/[0.04] px-3 py-2.5 text-[9px] text-[#D9FF87]/75"><CheckCircle2 className="h-4 w-4" /> 2FA ativo · {status.recoveryCodesRemaining} códigos de recuperação disponíveis</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[10px] text-white/55">Senha atual<input type="password" autoComplete="current-password" value={protectedPassword} onChange={(event) => setProtectedPassword(event.target.value)} className={inputClass} /></label>
              <label className="flex flex-col gap-1.5 text-[10px] text-white/55">Código 2FA ou de recuperação<input autoComplete="one-time-code" value={protectedCode} onChange={(event) => setProtectedCode(event.target.value)} className={inputClass} /></label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={regenerateRecoveryCodes} disabled={pending || !protectedPassword || !protectedCode} className={primaryButton}><RefreshCw className="h-3.5 w-3.5" /> Gerar novos códigos</button>
              <button type="button" onClick={disableTwoFactor} disabled={pending || !protectedPassword || !protectedCode} className="inline-flex h-9 items-center gap-2 rounded-md border border-red-400/20 px-4 text-[10px] font-semibold text-red-300 disabled:opacity-40"><ShieldOff className="h-3.5 w-3.5" /> Desativar 2FA</button>
            </div>
          </div>
        ) : null}

        {recoveryCodes ? (
          <div className="mt-4 rounded-md border border-amber-300/25 bg-amber-300/[0.06] p-4">
            <h3 className="text-[11px] font-bold text-amber-100">Salve estes códigos agora</h3>
            <p className="mt-1 text-[9px] leading-4 text-amber-100/55">Cada código funciona uma única vez e não será mostrado novamente.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{recoveryCodes.map((code) => <code key={code} className="rounded border border-white/10 bg-black/25 px-2 py-2 text-center text-[10px] text-white/80">{code}</code>)}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => copyText(recoveryCodes.join("\n"))} className={primaryButton}><Copy className="h-3.5 w-3.5" /> Copiar códigos</button>
              <button type="button" onClick={() => signOut({ redirectTo: "/login" })} className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-4 text-[10px] font-semibold text-white/65"><LogOut className="h-3.5 w-3.5" /> Salvei, entrar novamente</button>
            </div>
          </div>
        ) : null}
      </section>

      {!setupRequired || status.twoFactorEnabled ? (
        <>
          <section className="rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#A9EC17]/10 text-[#A9EC17]"><KeyRound className="h-4 w-4" /></span><div><h3 className="text-[10px] font-semibold text-white/70">Alterar senha</h3><p className="mt-1 text-[9px] leading-4 text-white/30">A alteração revoga imediatamente todos os JWTs administrativos existentes.</p></div></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[10px] text-white/55 sm:col-span-2">Senha atual<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} /></label>
              <label className="flex flex-col gap-1.5 text-[10px] text-white/55">Nova senha<input type="password" autoComplete="new-password" minLength={10} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} /></label>
              <label className="flex flex-col gap-1.5 text-[10px] text-white/55">Confirmar nova senha<input type="password" autoComplete="new-password" minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} /></label>
              <button type="button" onClick={changePassword} disabled={pending || !currentPassword || !newPassword || !confirmPassword} className={primaryButton}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Alterar senha</button>
            </div>
          </section>

          <section className="rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-400/10 text-red-300"><LogOut className="h-4 w-4" /></span><div><h3 className="text-[10px] font-semibold text-white/70">Revogar sessões</h3><p className="mt-1 text-[9px] leading-4 text-white/30">Encerra esta sessão e qualquer outro navegador que possua um JWT antigo.</p></div></div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex flex-1 flex-col gap-1.5 text-[10px] text-white/55">Confirme sua senha<input type="password" autoComplete="current-password" value={sessionPassword} onChange={(event) => setSessionPassword(event.target.value)} className={inputClass} /></label><button type="button" onClick={revokeSessions} disabled={pending || !sessionPassword} className="inline-flex h-9 items-center gap-2 rounded-md border border-red-400/20 px-4 text-[10px] font-semibold text-red-300 disabled:opacity-40"><LogOut className="h-3.5 w-3.5" /> Encerrar todas as sessões</button></div>
          </section>
        </>
      ) : null}
    </div>
  );
}
