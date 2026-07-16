type AdminLogoProps = {
  logoUrl: string;
  compact?: boolean;
  className?: string;
};

export default function AdminLogo({
  logoUrl,
  compact = false,
  className = "",
}: AdminLogoProps) {
  const safeUrl = logoUrl.replaceAll('"', "%22");

  return (
    <span
      role="img"
      aria-label="EcomZero Hub"
      className={`block h-9 bg-contain bg-center bg-no-repeat ${compact ? "w-10" : "w-28"} ${className}`}
      style={{ backgroundImage: `url("${safeUrl}")` }}
    />
  );
}
