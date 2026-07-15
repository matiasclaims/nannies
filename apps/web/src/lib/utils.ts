import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina clases de Tailwind resolviendo conflictos (idiom shadcn). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
