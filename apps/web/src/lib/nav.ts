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
import type { Rol } from '@/lib/api';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Aparece en el bottom-nav de celular (los 4-5 más usados). */
  movil?: boolean;
  /** Roles que ven el ítem. Si se omite, lo ven todos. */
  roles?: Rol[];
}

const COORD: Rol[] = ['DIRECTORA', 'SUBDIRECTORA'];

/**
 * Sidebar (ARQUITECTURA §3). Visibilidad por rol (reunión M2 · punto 15):
 * la nannie solo ve Panorama (su historial) y Calendario; el resto es de
 * coordinación (Directora/Subdirectora). El margen dentro de Finanzas se
 * filtra aparte a nivel de campo (solo Directora).
 */
export const NAV: NavItem[] = [
  { href: '/', label: 'Panorama', icon: LayoutDashboard, movil: true },
  { href: '/asignacion', label: 'Asignación', icon: ArrowLeftRight, movil: true, roles: COORD },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays, movil: true },
  { href: '/nannies', label: 'Nannies', icon: Users, movil: true, roles: COORD },
  { href: '/familias', label: 'Familias', icon: Heart, roles: COORD },
  { href: '/finanzas', label: 'Finanzas', icon: Wallet, roles: COORD },
  { href: '/reportes', label: 'Reportes', icon: ClipboardList, roles: COORD },
];

/** Ítems visibles para un rol (los que no declaran `roles` los ven todos). */
export function navPara(rol: Rol | undefined): NavItem[] {
  return NAV.filter((i) => !i.roles || (rol != null && i.roles.includes(rol)));
}
