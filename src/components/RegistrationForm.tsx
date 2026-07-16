"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";

type FieldName =
  | "name"
  | "email"
  | "phone"
  | "password"
  | "confirmPassword";

type FieldErrors = Partial<Record<FieldName, string>>;

const inputClassName =
  "h-12 w-full rounded-md border border-white/[0.16] bg-[#080808] px-4 text-sm text-white outline-none transition placeholder:text-white/32 hover:border-white/25 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)] aria-[invalid=true]:border-red-400/80 aria-[invalid=true]:focus:ring-red-400/60";

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

type RegistrationFormProps = {
  initialEmail?: string;
  returnTo?: "/" | "/checkout";
};

export default function RegistrationForm({
  initialEmail = "",
  returnTo = "/",
}: RegistrationFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRequirements = [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    {
      label: "Letras e números",
      met: /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password),
    },
    {
      label: "Ao menos 1 caractere especial",
      met: /[^A-Za-zÀ-ÿ0-9\s]/.test(password),
    },
  ];

  const clearFieldError = (field: FieldName) => {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    setStatusMessage("");
    setStatusIsError(false);
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const phoneDigits = phone.replace(/\D/g, "");

    if (name.trim().length < 2) {
      nextErrors.name = "Informe seu nome completo.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Informe um e-mail válido.";
    }

    if (!/^[1-9]{2}9\d{8}$/.test(phoneDigits)) {
      nextErrors.phone = "Informe um celular válido com DDD.";
    }

    if (passwordRequirements.some((requirement) => !requirement.met)) {
      nextErrors.password = "A senha ainda não atende a todos os requisitos.";
    }

    if (!confirmPassword || confirmPassword !== password) {
      nextErrors.confirmPassword = "As senhas não coincidem.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage("Revise os campos destacados para continuar.");
      setStatusIsError(true);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");
    setStatusIsError(false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: name,
          email,
          telefone: phone,
          senha: password,
          aceitaMarketing: acceptsMarketing,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        const message = payload?.error ?? "Não foi possível criar a conta.";
        if (response.status === 409) {
          setErrors((current) => ({ ...current, email: message }));
        }
        setStatusMessage(message);
        setStatusIsError(true);
        return;
      }

      const loginResult = await signIn("credentials", {
        email,
        senha: password,
        redirect: false,
      });

      if (!loginResult.ok) {
        setStatusMessage(
          "Conta criada, mas não foi possível entrar automaticamente. Tente entrar pela tela de login.",
        );
        setStatusIsError(true);
        return;
      }

      setStatusMessage("Conta criada com sucesso.");
      window.location.assign(returnTo);
    } catch {
      setStatusMessage("Não foi possível criar a conta agora. Tente novamente.");
      setStatusIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="registration-title"
      className="rounded-xl border border-white/[0.12] bg-[linear-gradient(145deg,#101010,#0B0B0B)] p-6 sm:p-8 lg:px-12 lg:py-10"
    >
      <div className="mx-auto w-full max-w-[520px]">
        <h1
          id="registration-title"
          className="font-display text-[30px] font-extrabold leading-tight text-white sm:text-[36px]"
        >
          Criar conta
        </h1>
        <p className="mt-1 text-sm text-white/55 sm:text-base">
          É rápido, fácil e seguro
        </p>

        <form className="mt-7 space-y-4" noValidate onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="mb-2 block text-[13px] font-semibold text-white">
              Nome completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearFieldError("name");
              }}
              placeholder="Digite seu nome completo"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={inputClassName}
            />
            {errors.name && (
              <p id="name-error" className="mt-1.5 text-xs text-red-300">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-[13px] font-semibold text-white">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFieldError("email");
              }}
              placeholder="Digite seu melhor e-mail"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={inputClassName}
            />
            {errors.email && (
              <p id="email-error" className="mt-1.5 text-xs text-red-300">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-[13px] font-semibold text-white">
              Telefone / WhatsApp
            </label>
            <div className="flex gap-2">
              <div
                aria-label="Código do país Brasil"
                className="flex h-12 w-[88px] shrink-0 items-center justify-between rounded-md border border-white/[0.16] bg-[#080808] px-4 text-sm text-white"
              >
                <span>+55</span>
                <span aria-hidden="true" className="text-white/50">⌄</span>
              </div>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(formatPhone(event.target.value));
                  clearFieldError("phone");
                }}
                placeholder="(11) 99999-9999"
                maxLength={15}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                className={`${inputClassName} min-w-0 flex-1`}
              />
            </div>
            {errors.phone && (
              <p id="phone-error" className="mt-1.5 text-xs text-red-300">
                {errors.phone}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-[13px] font-semibold text-white">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearFieldError("password");
                }}
                placeholder="Crie uma senha"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-requirements password-error" : "password-requirements"}
                className={`${inputClassName} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/55 transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-color)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="mt-1.5 text-xs text-red-300">
                {errors.password}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-[13px] font-semibold text-white">
              Confirmar senha
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  clearFieldError("confirmPassword");
                }}
                placeholder="Confirme sua senha"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                className={`${inputClassName} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/55 transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-color)]"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="mt-1.5 text-xs text-red-300">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div id="password-requirements" className="pt-0.5">
            <p className="text-xs text-white/55">A senha deve conter:</p>
            <ul className="mt-2 space-y-2">
              {passwordRequirements.map((requirement) => (
                <li
                  key={requirement.label}
                  className={`flex items-center gap-2 text-xs ${requirement.met ? "text-[var(--brand-color)]" : "text-white/48"}`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${requirement.met ? "border-[var(--brand-color)]" : "border-white/35"}`}
                  >
                    {requirement.met && <Check className="h-2.5 w-2.5" strokeWidth={2.5} />}
                  </span>
                  {requirement.label}
                </li>
              ))}
            </ul>
          </div>

          <label className="flex cursor-pointer items-start gap-3 pt-3 text-xs leading-5 text-white/60">
            <input
              type="checkbox"
              name="acceptsMarketing"
              checked={acceptsMarketing}
              onChange={(event) => setAcceptsMarketing(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-white/25 bg-black accent-[var(--brand-color)]"
            />
            <span>Quero receber ofertas e novidades por e-mail e WhatsApp</span>
          </label>

          {statusMessage && (
            <p
              role="status"
              className={`rounded-md border px-4 py-3 text-xs leading-5 ${statusIsError ? "border-red-400/30 bg-red-400/[0.06] text-red-200" : "border-[var(--brand-color)]/30 bg-[var(--brand-color)]/[0.06] text-[#D5FF7B]"}`}
            >
              {statusMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="store-primary-action font-display flex min-h-12 w-full items-center justify-center px-5 text-xs font-extrabold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:translate-y-px disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
      </div>
    </section>
  );
}
