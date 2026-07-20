import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminShell from "@/components/layout/AdminShell";
import SecuritySettingsSection from "@/components/configuracoes/SecuritySettingsSection";
import { auth } from "@/auth";
import { config } from "@/lib/config";
import { getAdminSecurityStatus } from "@/lib/actions/adminSecurity";

// Layout do grupo (painel): tudo aqui dentro é o admin autenticado, envolto no
// AdminShell (sidebar + header). O middleware já garante que só chega aqui com
// sessão válida. A tela de /login vive fora deste grupo, em (auth)/, sem shell.
export default async function PainelLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const securityStatus = await getAdminSecurityStatus();
  if (!session?.user || !securityStatus) redirect("/login");
  return (
    <AdminShell
      userLabel={session?.user?.email ?? "Administrador"}
      logoUrl={config.adminLogoUrl}
    >
      {config.requireTwoFactor && securityStatus && !securityStatus.twoFactorEnabled ? (
        <div className="mx-auto max-w-4xl rounded-[10px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] p-5 sm:p-7">
          <SecuritySettingsSection initialStatus={securityStatus} setupRequired />
        </div>
      ) : children}
    </AdminShell>
  );
}
