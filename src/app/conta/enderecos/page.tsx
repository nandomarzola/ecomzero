import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountAddressManager from "@/components/AccountAddressManager";
import { auth } from "@/lib/auth";
import { getAddressesByUser } from "@/lib/services/accountService";

export const metadata: Metadata = {
  title: "Meus endereços",
};

export default async function AccountAddressesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const addresses = await getAddressesByUser(session.user.id);

  return (
    <section aria-labelledby="account-addresses-title">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-color)]">Entrega</p>
      <h2 id="account-addresses-title" className="font-display mt-1 text-2xl font-extrabold text-white">
        Meus endereços
      </h2>
      <p className="mt-2 text-sm text-white/45">Gerencie os locais usados para receber suas compras.</p>
      <div className="mt-5">
        <AccountAddressManager initialAddresses={addresses} />
      </div>
    </section>
  );
}
