'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import { processCalculatorForm, calculate } from '@/utils';
import CalculationResult from '@/components/CalculationResult';

const CalculatorForm = () => {
  const initialFormState = {
    product_name: 'Seu Produto',
    product_cost: '',
    selling_price: '',
    logistic_cost: '0,00',
    is_new_seller: '',
    is_in_free_shipping_program: '',
    additional_commission_percent: '0,00',
  };

  const [form, setForm] = useState(initialFormState);

  const [calculationResult, setCalculationResult] = useState<{
    message: string;
    calculation: {
      marketplace: string;
      product_cost: number;
      selling_price: number;
      logistic_cost: number;
      is_new_seller: boolean;
      is_in_free_shipping_program: boolean;
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
    };
  } | null>(null); // Estado para armazenar o resultado do cálculo

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value, // Mantém o valor como string para permitir vírgulas
    }));
  };

  const handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    const sanitizedValue = value.replace(/[^0-9,]/g, '');

    setForm((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Processa os dados do formulário
      const processedData = processCalculatorForm({
        ...form,
        is_new_seller: form.is_new_seller === 'sim',
        is_in_free_shipping_program: form.is_in_free_shipping_program === 'sim',
      });

      if (!processedData) {
        alert('Erro ao processar os dados do formulário.');
        return;
      }

      // Realiza o cálculo
      const result = calculate(processedData);

      // Atualiza o estado com o resultado do cálculo
      setCalculationResult(result);

      console.log('Resultado do cálculo:', result);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Erro ao calcular:', error.message);
      } else {
        console.error('Erro ao calcular:', error);
      }
      alert('Ocorreu um erro ao realizar o cálculo.');
    }
  };

  const handleReset = () => {
    // Redefine o estado do formulário e do resultado
    setForm(initialFormState);
    setCalculationResult(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 bg-white p-6 md:p-10 rounded-xl shadow-md">
      {/* <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
        Calculadora de Marketplace
      </h2> */}

      {!calculationResult ? (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Custo do produto"
              name="product_cost"
              type="text"
              value={form.product_cost}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              placeholder="Ex: 5,00"
            />

            <Input
              label="Preço de venda"
              name="selling_price"
              type="text"
              value={form.selling_price}
              onChange={handleChange}
              required
              placeholder="Ex: 11,99"
            />

            <Input
              label="Custo logístico"
              name="logistic_cost"
              type="text"
              value={form.logistic_cost}
              onChange={handleChange}
              placeholder="Ex: 0"
              description="Embalagens, mão de obra ou outros custos."
            />

            <Input
              label="Comissão adicional (%)"
              name="additional_commission_percent"
              type="text"
              value={form.additional_commission_percent}
              onChange={handleChange}
              placeholder="Ex: 2,00"
              description="Campanhas ou outras taxas!"
            />

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                É novo vendedor?
              </label>
              <span className="text-xs text-gray-500 mb-2">
                Caso seja vendedor a menos de 30 dias na shopee
              </span>
              <select
                name="is_new_seller"
                value={form.is_new_seller}
                onChange={handleChange}
                required
                className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-red-800 focus:border-red-800"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Participa do frete grátis?
              </label>
              <span className="text-xs text-gray-500 mb-2">
                &nbsp;
              </span>
              <select
                name="is_in_free_shipping_program"
                value={form.is_in_free_shipping_program}
                onChange={handleChange}
                required
                className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-red-800 focus:border-red-800"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="mt-8 w-full bg-red-800 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition"
          >
            Calcular
          </button>
        </form>
      ) : (
        <CalculationResult
          result={calculationResult.calculation.result}
          onReset={handleReset} // Função para reiniciar o cálculo e limpar os inputs
        />
      )}
    </div>
  );
};

export default CalculatorForm;
