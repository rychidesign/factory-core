import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind-aware classname merger used by every shadcn/ui component.
 * Combines clsx (conditional class joining) with tailwind-merge
 * (last-write-wins for conflicting Tailwind utilities).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
