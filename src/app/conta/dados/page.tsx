import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountProfileForm from "@/components/AccountProfileForm";
import { auth } from "@/lib/auth";
import { getProfile } from "@/lib/services/accountService";

export const metadata: Metadata = {
  title: "Meus dados",
};

export default async function AccountDataPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await getProfile(session.user.id);

  return (
    <section aria-labelledby="account-data-title">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-color)]">Cadastro</p>
      <h2 id="account-data-title" className="font-display mt-1 text-2xl font-extrabold text-white">
        Meus dados
      </h2>
      <p className="mt-2 text-sm text-white/45">Atualize suas informações pessoais e sua senha de acesso.</p>
      <div className="mt-5">
        <AccountProfileForm profile={profile} />
      </div>
    </section>
  );
}
