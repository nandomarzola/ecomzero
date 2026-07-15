export const bannerSpecs = {
  hero_slide: { label: "Slide principal", description: "Carrossel no topo da página inicial", width: 1440, height: 560 },
  home_middle: { label: "Faixa intermediária", description: "Entre as seções de produtos da home", width: 1200, height: 320 },
  home_bottom: { label: "Faixa inferior", description: "Antes do rodapé da página inicial", width: 1200, height: 260 },
} as const;

export type BannerPositionValue = keyof typeof bannerSpecs;
