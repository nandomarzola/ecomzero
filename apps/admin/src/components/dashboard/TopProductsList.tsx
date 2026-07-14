// Dados de exemplo — sem backend ainda. Trocar por fetch real quando a API existir.
type Product = { nome: string; quantidade: number };

const products: Product[] = [
  { nome: "Sensor Alarme Magnético", quantidade: 84 },
  { nome: "Lâmpada LED Recarregável", quantidade: 67 },
  { nome: "Canivete Tático Xingu", quantidade: 52 },
  { nome: "Abraçadeira Nylon 200un", quantidade: 41 },
  { nome: "Veja Limpador Concentrado", quantidade: 33 },
];

export default function TopProductsList() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111111]">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <h2 className="font-display text-sm font-bold text-white">Produtos mais vendidos</h2>
      </div>
      <ul className="divide-y divide-white/[0.06]">
        {products.map((product, index) => (
          <li key={product.nome} className="flex items-center gap-3 px-5 py-3">
            <span className="w-5 shrink-0 text-xs font-semibold text-white/30">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-white/80">{product.nome}</span>
            <span className="shrink-0 text-sm font-semibold text-white">{product.quantidade}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
