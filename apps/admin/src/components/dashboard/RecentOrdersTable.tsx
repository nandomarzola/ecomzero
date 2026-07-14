// Dados de exemplo — sem backend ainda. Trocar por fetch real quando a API existir.
type Order = {
  numero: string;
  cliente: string;
  valor: string;
  status: "Pago" | "Enviado" | "Pendente" | "Cancelado";
  data: string;
};

const orders: Order[] = [
  { numero: "#1042", cliente: "Ana Souza", valor: "R$ 189,90", status: "Pago", data: "13/07" },
  { numero: "#1041", cliente: "Bruno Lima", valor: "R$ 64,90", status: "Enviado", data: "13/07" },
  { numero: "#1040", cliente: "Carla Dias", valor: "R$ 249,00", status: "Pendente", data: "12/07" },
  { numero: "#1039", cliente: "Diego Alves", valor: "R$ 39,90", status: "Pago", data: "12/07" },
  { numero: "#1038", cliente: "Elisa Prado", valor: "R$ 129,90", status: "Cancelado", data: "11/07" },
];

// Sem cor extra — só variação de peso/opacidade dentro da paleta neutra + verde.
const statusStyle: Record<Order["status"], string> = {
  Pago: "text-[#A9EC17]",
  Enviado: "text-[#A9EC17]",
  Pendente: "text-white/50",
  Cancelado: "text-white/30",
};

export default function RecentOrdersTable() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111111]">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <h2 className="font-display text-sm font-bold text-white">Últimos pedidos</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-white/40">
              <th className="px-5 py-2.5 font-medium">Número</th>
              <th className="px-5 py-2.5 font-medium">Cliente</th>
              <th className="px-5 py-2.5 font-medium">Valor</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.numero} className="border-t border-white/[0.06]">
                <td className="px-5 py-3 font-medium text-white">{order.numero}</td>
                <td className="px-5 py-3 text-white/70">{order.cliente}</td>
                <td className="px-5 py-3 text-white/70">{order.valor}</td>
                <td className={`px-5 py-3 font-medium ${statusStyle[order.status]}`}>
                  {order.status}
                </td>
                <td className="px-5 py-3 text-white/40">{order.data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
