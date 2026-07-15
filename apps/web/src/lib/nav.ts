import {
  LayoutDashboard,
  ArrowLeftRight,
  CalendarDays,
  Users,
  Heart,
  Wallet,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Aparece en el bottom-nav de celular (los 4-5 más usados). */
  movil?: boolean;
}

/**
 * Sidebar según ARQUITECTURA §3 (etiquetas confirmadas con Matías):
 * Panorama · Asignación · Calendario · Nannies · Familias · Finanzas · Reportes.
 * La visibilidad por rol se aplicará al montar cada módulo (M7/M3 tienen
 * secciones solo-Directora); aquí va la estructura de navegación.
 */
export const NAV: NavItem[] = [
  { href: '/', label: 'Panorama', icon: LayoutDashboard, movil: true },
  { href: '/asignacion', label: 'Asignación', icon: ArrowLeftRight, movil: true },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays, movil: true },
  { href: '/nannies', label: 'Nannies', icon: Users, movil: true },
  { href: '/familias', label: 'Familias', icon: Heart },
  { href: '/finanzas', label: 'Finanzas', icon: Wallet },
  { href: '/reportes', label: 'Reportes', icon: ClipboardList },
];
