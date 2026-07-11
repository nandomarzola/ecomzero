import Image from "next/image";
import logo from "../../public/images/logo2.png";

type BrandLogoProps = {
  priority?: boolean;
  className?: string;
};

export default function BrandLogo({
  priority = false,
  className = "",
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center ${className}`} aria-label="EcomZero">
      <span className="relative h-8 w-12 shrink-0 overflow-hidden" aria-hidden="true">
        <Image
          src={logo}
          alt=""
          priority={priority}
          className="absolute -left-4 -top-3 h-20 w-20 max-w-none"
        />
      </span>
      <span className="relative h-9 w-32 overflow-hidden" aria-hidden="true">
        <Image
          src={logo}
          alt=""
          priority={priority}
          className="absolute -top-16 left-0 h-32 w-32 max-w-none"
        />
      </span>
    </span>
  );
}
