"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, X } from "lucide-react";

export default function TemporaryPasswordReminder() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <aside className="account-password-reminder hidden max-md:flex" role="status">
      <KeyRound className="account-password-reminder-icon" aria-hidden="true" />
      <div className="account-password-reminder-content">
        <strong>Você está usando uma senha temporária</strong>
        <p>Troque quando quiser para uma senha escolhida por você.</p>
        <Link href="/conta/dados#account-change-password">
          Alterar minha senha
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dispensar aviso de senha temporária"
        className="account-password-reminder-close"
      >
        <X aria-hidden="true" />
      </button>
    </aside>
  );
}
