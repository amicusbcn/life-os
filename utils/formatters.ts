// utils/formatters.ts

/**
 * Formatea un número decimal a un string con dos decimales y separador de miles.
 * Se puede usar para formatos de moneda o distancias.
 */
export function formatNumber(
    value: number | string | null | undefined, 
    decimals: number = 2
): string {
    if (value === null || value === undefined) return '0.00';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) return '0.00';

    return num.toLocaleString('es-ES', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
}