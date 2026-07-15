import Link from "next/link";

export default function AnnouncementBar({ text, href }: { text: string; href: string | null }) {
  const className = "block bg-[#A9EC17] px-4 py-2 text-center font-display text-[10px] font-bold uppercase tracking-wide text-black";
  return href ? <Link href={href} className={`${className} hover:brightness-105`}>{text}</Link> : <p className={className}>{text}</p>;
}
