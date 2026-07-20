"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import type {
  OAuthAvailability,
  OAuthProviderId,
} from "@/lib/security/oauth";

type OAuthButtonsProps = {
  availability: OAuthAvailability;
  callbackUrl: "/" | "/checkout" | "/conta/dados";
  mode?: "signin" | "connect";
  connectedProviders?: OAuthProviderId[];
};

const providers: Array<{
  id: OAuthProviderId;
  name: string;
}> = [
  { id: "google", name: "Google" },
  { id: "facebook", name: "Facebook" },
];

function ProviderIcon({ provider }: { provider: OAuthProviderId }) {
  if (provider === "google") {
    return (
      <span
        aria-hidden="true"
        className="absolute left-4 bg-[conic-gradient(from_-45deg,#4285F4_0_25%,#34A853_0_45%,#FBBC05_0_70%,#EA4335_0)] bg-clip-text text-xl font-extrabold text-transparent"
      >
        G
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="absolute left-4 flex h-5 w-5 items-end justify-center rounded-full bg-[#1877F2] text-base font-bold leading-[18px] text-white"
    >
      f
    </span>
  );
}

export default function OAuthButtons({
  availability,
  callbackUrl,
  mode = "signin",
  connectedProviders = [],
}: OAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<OAuthProviderId | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");

  const startOAuth = async (provider: OAuthProviderId) => {
    setPendingProvider(provider);
    setErrorMessage("");

    try {
      await signIn(provider, { redirectTo: callbackUrl });
    } catch {
      setPendingProvider(null);
      setErrorMessage(
        "Não foi possível abrir o provedor. Tente novamente em instantes.",
      );
    }
  };

  return (
    <div className="grid gap-3">
      {providers.map(({ id, name }) => {
        const connected = connectedProviders.includes(id);
        const available = availability[id];
        const pending = pendingProvider === id;
        const disabled = !available || connected || pendingProvider !== null;
        const label = connected
          ? `${name} conectado`
          : !available
            ? `${name} indisponível`
            : pending
              ? `Abrindo ${name}...`
              : mode === "connect"
                ? `Conectar ${name}`
                : `Continuar com ${name}`;

        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => startOAuth(id)}
            aria-label={label}
            className="relative flex min-h-12 items-center justify-center rounded-md border border-white/[0.16] bg-[#080808] px-12 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ProviderIcon provider={id} />
            {label}
          </button>
        );
      })}

      {errorMessage && (
        <p
          role="alert"
          className="rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-xs leading-5 text-red-200"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
