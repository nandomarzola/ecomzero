"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export default function PasswordField() {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-3 text-sm font-semibold text-white sm:text-base">
      Senha
      <span className="relative block">
        <LockKeyhole
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[#A9EC17]"
          strokeWidth={1.8}
        />
        <input
          type={visible ? "text" : "password"}
          name="password"
          required
          autoComplete="current-password"
          placeholder="Digite sua senha"
          className="h-16 w-full rounded-xl border border-white/[0.18] bg-[#080908] pl-16 pr-16 text-base font-normal text-white outline-none transition placeholder:text-white/38 focus:border-[#A9EC17]/60 focus:ring-2 focus:ring-[#A9EC17]/10 sm:h-[76px] sm:text-lg"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="absolute right-5 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/45 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-[#A9EC17]/40"
        >
          {visible ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
        </button>
      </span>
    </label>
  );
}
