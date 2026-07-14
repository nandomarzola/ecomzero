export type ProductVariant = {
  id: string;
  label: string;
  precoDe: number;
  precoPor: number;
  skuInterno: string | null;
  linkShopee: string | null;
};

export type Product = {
  id: string;
  slug: string;
  categoria: string;
  nome: string;
  subtitulo: string;
  descricao: string;
  imagem: string;
  imagens: string[];
  caracteristicas: string[];
  linkShopee: string | null;
  ativo: boolean;
  variantes: ProductVariant[];
};
