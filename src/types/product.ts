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
  categoryId: string | null;
  tipo: "simples" | "variacoes";
  nome: string;
  subtitulo: string;
  descricao: string;
  imagem: string;
  imagens: string[];
  caracteristicas: string[];
  linkShopee: string | null;
  linkMercadoLivre: string | null;
  linkTiktokShop: string | null;
  linkShein: string | null;
  avaliacaoMedia: number | null;
  totalAvaliacoes: number;
  ativo: boolean;
  variantes: ProductVariant[];
};
