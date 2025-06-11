'use client';
import React from 'react';

interface CalculationResultProps {
  result: {
    gross_revenue: number;
    commission: number;
    fixed_fee: number;
    order_income: number;
    product_cost: number;
    logistic_cost_net: number;
    total_fees: number;
    net_revenue: number;
    profit: number;
    profit_margin_percent: number;
  };
  onReset: () => void;
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const cards = [
  { key: 'gross_revenue', label: 'Receita Bruta' },
  { key: 'commission', label: 'Comissão' },
  { key: 'fixed_fee', label: 'Taxa Fixa' },
  { key: 'order_income', label: 'Receita do Pedido' },
  { key: 'product_cost', label: 'Custo do Produto' },
  { key: 'logistic_cost_net', label: 'Custo Logístico Líquido' },
  { key: 'total_fees', label: 'Taxas Totais' },
  { key: 'net_revenue', label: 'Receita Líquida' },
  { key: 'profit', label: 'Lucro' },
  { key: 'profit_margin_percent', label: 'Margem de Lucro (%)', isPercentage: true },
];

const CalculationResult: React.FC<CalculationResultProps> = ({ result, onReset }) => {
  return (
    <div className=" bg-white p-4 sm:p-6 rounded-2xl shadow-md max-w-4xl mx-auto">
      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
        Resultado do Cálculo
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {cards.map(({ key, label, isPercentage }) => (
          <div
            key={key}
            className="bg-gray-50 p-3 rounded-lg shadow-sm text-center border"
          >
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-sm font-semibold text-gray-800 mt-1">
              {isPercentage
                ? `${(result as any)[key].toFixed(2)}%`
                : formatCurrency((result as any)[key])}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onReset}
        className="mt-6 w-full bg-red-800 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition"
      >
        Fazer novo cálculo
      </button>
    </div>
  );
};

export default CalculationResult;
