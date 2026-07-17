"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { changeAdminPasswordAction } from "@/lib/actions/adminSecurity";

const inputClass = "h-10 rounded-md border border-white/[0.09] bg-[#090909] px-3 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-[#A9EC17]/45";

export default function SecuritySettingsSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await changeAdminPasswordAction({ currentPassword, newPassword, confirmPassword });
      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Senha alterada com sucesso." });
    });
  }

  return (
    <div className="space-y-5">
      <header><h2 className="font-display text-[15px] font-bold text-white">Segurança</h2><p className="mt-1 text-[10px] text-white/38">Atualize a credencial da conta administrativa conectada.</p></header>
      <section className="rounded-md border border-white/[0.07] bg-black/[0.08] p-4">
        <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#A9EC17]/10 text-[#A9EC17]"><KeyRound className="h-4 w-4" /></span><div><h3 className="text-[10px] font-semibold text-white/70">Alterar senha</h3><p className="mt-1 text-[9px] leading-4 text-white/30">A nova senha precisa ter ao menos 10 caracteres, letra maiúscula, minúscula e número.</p></div></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[10px] text-white/55 sm:col-span-2">Senha atual<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} /></label>
          <label className="flex flex-col gap-1.5 text-[10px] text-white/55">Nova senha<input type="password" autoComplete="new-password" required minLength={10} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} /></label>
          <label className="flex flex-col gap-1.5 text-[10px] text-white/55">Confirmar nova senha<input type="password" autoComplete="new-password" required minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} /></label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button type="button" onClick={submit} disabled={pending || !currentPassword || !newPassword || !confirmPassword} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#A9EC17] px-4 text-[10px] font-bold text-black transition hover:brightness-110 disabled:opacity-45">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Alterar senha</button>{message ? <span role="status" className={`inline-flex items-center gap-1.5 text-[10px] ${message.type === "success" ? "text-[#A9EC17]" : "text-red-300"}`}>{message.type === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}{message.text}</span> : null}</div>
        </div>
      </section>
      <div className="rounded-md border border-sky-400/15 bg-sky-400/[0.04] px-4 py-3 text-[9px] leading-4 text-sky-100/55">Autenticação em dois fatores depende de um segundo fator, recuperação e armazenamento de segredo. Ela não foi simulada nesta entrega.</div>
    </div>
  );
}
