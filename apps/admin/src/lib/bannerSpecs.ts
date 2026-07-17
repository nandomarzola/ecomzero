export const bannerSpecs = {
  hero_slide: { label: "Slide principal", description: "Carrossel no topo da página inicial", width: 1920, height: 819 },
  home_middle: { label: "Faixa intermediária", description: "Banner entre as seções Novidades e Promoções", width: 1920, height: 819 },
  // Faixa inferior = PAR de 2 banners quadrados lado a lado (2 registros
  // distintos), entre Promoções e Mais Vendidos. Cada imagem é 1 quadrado 1:1.
  home_bottom: { label: "Faixa inferior (par de quadrados)", description: "Cadastre 2 banners quadrados — aparecem lado a lado entre Promoções e Mais Vendidos", width: 600, height: 600 },
} as const;

export type BannerPositionValue = keyof typeof bannerSpecs;
