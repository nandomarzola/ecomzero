import type { Metadata } from "next";
import AdminPasswordResetForm from "@/components/auth/AdminPasswordResetForm";

export const metadata: Metadata = {
  title: "Redefinir senha",
  robots: { index: false, follow: false },
};

export default function AdminPasswordResetPage() {
  return <AdminPasswordResetForm />;
}
