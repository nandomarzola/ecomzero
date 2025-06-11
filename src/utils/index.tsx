// Função para formatar valores para BRL
export const formatToBRL = (value: string): string => {
  // Remove caracteres inválidos e substitui vírgula por ponto para conversão
  const numericValue = parseFloat(value.replace(',', '.'));

  // Retorna o valor formatado em BRL ou vazio se inválido
  if (!isNaN(numericValue)) {
    return numericValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  return '';
};

// Define a interface para os dados do formulário
export interface CalculatorFormData {
  product_name: string; // Nome do produto
  product_cost: string; // Custo do produto (string para permitir vírgula)
  selling_price: string; // Preço de venda (string para permitir vírgula)
  logistic_cost: string; // Custo logístico (string para permitir vírgula)
  is_new_seller: boolean; // Indica se é novo vendedor
  is_in_free_shipping_program: boolean; // Indica se participa do frete grátis
  additional_commission_percent?: string; // Comissão adicional opcional (string para permitir vírgula)
}

/**
 * Processa os valores recebidos do CalculatorForm.
 * @param {CalculatorFormData} formData - Dados do formulário em JSON.
 * @returns {Object} - Dados processados e validados.
 */
export const processCalculatorForm = (formData: CalculatorFormData) => {
  try {
    // Validação básica dos campos obrigatórios
    if (!formData.product_name || !formData.product_cost || !formData.selling_price) {
      throw new Error('Os campos obrigatórios não foram preenchidos.');
    }

    // Conversão de valores para números decimais
    const processedData = {
      product_name: formData.product_name.trim(),
      product_cost: parseFloat(formData.product_cost.replace(',', '.')) || 0,
      selling_price: parseFloat(formData.selling_price.replace(',', '.')) || 0,
      logistic_cost: parseFloat(formData.logistic_cost.replace(',', '.')) || 0,
      is_new_seller: formData.is_new_seller,
      is_in_free_shipping_program: formData.is_in_free_shipping_program,
      additional_commission_percent: parseFloat(formData.additional_commission_percent?.replace(',', '.') || '0'),
    };

    return processedData;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Erro ao processar os dados do formulário:', error.message);
    } else {
      console.error('Erro desconhecido ao processar os dados do formulário.');
    }
    return null;
  }
};

// Define a interface para os dados do cálculo
export interface CalculationData {
  product_cost: number; // Custo do produto
  selling_price: number; // Preço de venda
  logistic_cost: number; // Custo logístico
  is_new_seller: boolean; // Indica se é novo vendedor
  is_in_free_shipping_program: boolean; // Indica se participa do frete grátis
  additional_commission_percent?: number; // Comissão adicional opcional
}

/**
 * Função para calcular os valores com base nos dados fornecidos.
 * @param {CalculationData} data - Dados do formulário.
 * @returns {Object} - Resultado do cálculo.
 */
export const calculate = (data: CalculationData) => {
  // Validação básica dos campos obrigatórios
  if (
    data.product_cost === undefined ||
    data.selling_price === undefined ||
    data.logistic_cost === undefined ||
    data.is_new_seller === undefined ||
    data.is_in_free_shipping_program === undefined
  ) {
    throw new Error('Os campos obrigatórios não foram preenchidos.');
  }

  const product_cost = data.product_cost;
  const logistic_cost = data.logistic_cost;
  const selling_price = data.selling_price;
  const is_in_free_shipping_program = data.is_in_free_shipping_program;

  // Converte a comissão adicional para formato decimal
  const additional_commission_percent = data.additional_commission_percent
    ? parseFloat(data.additional_commission_percent.toString().replace(',', '.')) / 100
    : 0;

  // Comissão base
  let commission_percent = 0.125 + 0.015; // Comissão padrão (12.5% + 1.5%)

  // Adiciona comissão de frete grátis, se aplicável
  if (is_in_free_shipping_program) {
    commission_percent += 0.06; // Adiciona 6% se participar do frete grátis
  }

  // Adiciona comissão adicional, se aplicável
  commission_percent += additional_commission_percent;

  // Calcula a comissão
  const commission = selling_price * commission_percent;

  // Calcula a taxa fixa
  let fixed_fee;
  if (selling_price < 8.00) {
    fixed_fee = selling_price * 0.5; // 50% do preço de venda se for menor que 8.00
  } else {
    fixed_fee = 4.00; // Taxa fixa de 4.00 para preços maiores ou iguais a 8.00
  }

  // Calcula as taxas totais
  const total_fees = commission + fixed_fee;

  // Calcula o desconto de frete, se aplicável
  const freight_discount = is_in_free_shipping_program ? logistic_cost * 0.5 : 0;
  const logistic_cost_net = Math.max(logistic_cost - freight_discount, 0);

  // Calcula a receita líquida
  const net_revenue = selling_price - total_fees;

  // Calcula o lucro
  const profit = net_revenue - product_cost - logistic_cost_net;

  // Calcula a margem de lucro percentual
  const profit_margin_percent = selling_price > 0 ? (profit / selling_price) * 100 : 0;

  // Calcula a receita do pedido
  const order_income = selling_price - commission - fixed_fee;

  // Resultado final
  const result = {
    gross_revenue: parseFloat(selling_price.toFixed(2)),
    commission: parseFloat(commission.toFixed(2)),
    fixed_fee: parseFloat(fixed_fee.toFixed(2)),
    order_income: parseFloat(order_income.toFixed(2)),
    product_cost: parseFloat(product_cost.toFixed(2)),
    logistic_cost_net: parseFloat(logistic_cost_net.toFixed(2)),
    total_fees: parseFloat(total_fees.toFixed(2)),
    net_revenue: parseFloat(net_revenue.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    profit_margin_percent: parseFloat(profit_margin_percent.toFixed(2)),
  };

  return {
    message: 'Cálculo realizado com sucesso.',
    calculation: {
      marketplace: 'shopee',
      product_cost,
      selling_price,
      logistic_cost,
      is_new_seller: data.is_new_seller,
      is_in_free_shipping_program,
      result,
    },
  };
};