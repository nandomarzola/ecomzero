import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tags,
  Users,
  Ticket,
  Image as ImageIcon,
  Truck,
  Settings,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/avaliacoes", label: "Avaliações", icon: MessageSquareText },
  { href: "/cupons", label: "Cupons", icon: Ticket },
  { href: "/banners", label: "Banners", icon: ImageIcon },
  { href: "/fretes", label: "Fretes", icon: Truck },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
