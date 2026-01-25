import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency = 'EUR') {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
    useGrouping: 'always',
  }).format(value);
}