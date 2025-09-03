"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-6 mt-10">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
        {/* Logo / Nome do site */}
        <div className="text-lg font-semibold text-white">
          © {new Date().getFullYear()} EcomZero
        </div>

        {/* Links obrigatórios */}
        <nav className="flex gap-6 mt-4 md:mt-0">
          <Link href="/privacy-policy" className="hover:text-white transition">
            Política de Privacidade
          </Link>
          <Link href="/about" className="hover:text-white transition">
            Sobre
          </Link>
          <Link href="/contact" className="hover:text-white transition">
            Contato
          </Link>
        </nav>
      </div>
    </footer>
  );
}
