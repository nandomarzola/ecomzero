import BrandLogo from "@/components/BrandLogo";
import { Clock3 } from "lucide-react";

export default function MaintenancePage({ logoUrl, storeName, message }: { logoUrl: string; storeName: string; message: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(169,236,23,0.08),transparent_35%),#050505] px-6 text-center text-white"><section className="max-w-lg"><div className="mx-auto flex justify-center"><BrandLogo src={logoUrl} name={storeName} /></div><span className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--brand-color)]/30 bg-[var(--brand-color)]/10 text-[var(--brand-color)]"><Clock3 className="h-7 w-7" /></span><h1 className="font-display mt-6 text-3xl font-extrabold">Loja em manutenção</h1><p className="mt-4 text-sm leading-7 text-white/55">{message}</p></section></main>;
}
