import type { Metadata } from "next";
import AdminPasswordRecoveryForm from "@/components/auth/AdminPasswordRecoveryForm";

export const metadata: Metadata = {
  title: "Recuperar senha",
  robots: { index: false, follow: false },
};

export default async function AdminPasswordRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialEmail =
    typeof params.email === "string" ? params.email.slice(0, 160) : "";
  return <AdminPasswordRecoveryForm initialEmail={initialEmail} />;
}
