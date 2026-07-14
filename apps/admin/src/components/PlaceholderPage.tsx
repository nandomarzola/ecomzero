type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#111111] px-6 text-center">
      <p className="font-display text-base font-bold text-white">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-white/50">
        {description ?? "Essa seção ainda não foi implementada."}
      </p>
    </div>
  );
}
