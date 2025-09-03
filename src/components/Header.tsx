// src/components/Header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "../../public/images/logo2.png";

export default function Header() {
  const pathname = usePathname();

  // Menus atualizados
  const menus = [
    { name: "Início", href: "/" },
    { name: "Economia", href: "/economia" },
    { name: "Política", href: "/politica" },
    { name: "Contato", href: "/contact" },
    // { name: "Calculadora", href: "/calculate" },
  ];

  return (
    <header className="w-full bg-[#7b1f24] shadow-inner-header">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center">
          <Image
            src={logo}
            alt="Logo Ecomzero"
            width={180}
            height={100}
            className="object-contain"
          />
        </Link>

        {/* Menu */}
        <nav className="flex gap-6 mt-4 md:mt-0">
          {menus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className={`font-medium transition ${
                pathname === menu.href
                  ? "text-white underline"
                  : "text-gray-200 hover:text-white"
              }`}
            >
              {menu.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
