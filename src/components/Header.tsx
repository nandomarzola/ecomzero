// src/components/Header.tsx
import Image from 'next/image';
import logo from '../../public/images/logo.png';

export default function Header() {
  return (
    <header className="w-full h-40 bg-[#7b1f24] flex items-center justify-center relative shadow-inner-header">
      <Image
        src={logo}
        alt="Logo Ecomzero"
        width={290}
        height={150}
        className="object-contain"
      />
    </header>
  );
}
