// app/finance/actions/importEngine.ts

export interface AppBounds {
    appNewestDate: string | null;
    appOldestDate: string | null;
    appCurrentBalance: number;
    appInitialBalance: number;
}

export interface CsvImportSettings {
    dateIdx: number;
    conceptIdx: number;
    amountIdx: number;
    balanceIdx: number;
    invertAmount: boolean;
    fileOrder: 'newest_first' | 'oldest_first';
}

export interface ParsedTxRow {
    dateStr: string;        // YYYY-MM-DD
    displayDate: string;    // DD/MM/YYYY
    concept: string;
    amount: number;
    bank_balance: number | null;
    rawIndex: number;
    hash: string;
}

export type ImportScenario = 
    | 'EMPTY_APP'          // A: App vacía
    | 'ALL_DUPLICATED'     // B1: Duplicado entero
    | 'NEW'                // B3: Movimientos nuevos / futuros
    | 'HISTORIC'           // B4: Movimientos históricos
    | 'SANDWICH'           // B2: Pasado y futuro combinados
    | 'GAP_DETECTED';      // Descuadre en semáforo de saldos

export interface ImportEngineResult {
    scenario: ImportScenario;
    realMode: 'new' | 'historic' | 'sandwich' | 'none';
    rowsToInsert: ParsedTxRow[];
    isBlocked: boolean;
    bannerType: 'success' | 'warning' | 'error' | 'info';
    bannerTitle: string;
    bannerMessage: string;
    
    totalCsvRows: number;
    dupesCount: number;
    unmatchedInBetweenCount: number;
    
    expectedBalance?: number;
    actualFileBalance?: number;
}

function parseToDate(dStr: string | null): Date | null {
    if (!dStr || dStr === 'Sin movimientos') return null;
    const cleanStr = dStr.replace(/[^\d/]/g, '').trim();
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    const isoParts = cleanStr.split('-');
    if (isoParts.length === 3) {
        return new Date(parseInt(isoParts[0], 10), parseInt(isoParts[1], 10) - 1, parseInt(isoParts[2], 10));
    }
    return null;
}

function parseSpanishFloat(str: string): number {
    if (!str) return 0;
    let n = str.trim();
    if (n.includes('.') && !n.includes(',')) return parseFloat(n) || 0;
    const clean = n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    return parseFloat(clean) || 0;
}

/**
 * Ordena filas cronológicamente de forma estricta (de más antigua a más reciente).
 * Si coinciden las fechas en un CSV descendente (más reciente arriba),
 * la fila con mayor rawIndex es la operación MÁS ANTIGUA del día.
 */
function sortChronologically(rows: ParsedTxRow[], isDescending: boolean): ParsedTxRow[] {
    return [...rows].sort((a, b) => {
        const timeA = parseToDate(a.displayDate)?.getTime() || 0;
        const timeB = parseToDate(b.displayDate)?.getTime() || 0;

        if (timeA !== timeB) {
            return timeA - timeB; // Ascendente por fecha
        }

        // Si la fecha es idéntica en CSV descendente, mayor rawIndex = más antiguo
        return isDescending ? b.rawIndex - a.rawIndex : a.rawIndex - b.rawIndex;
    });
}

export function analyzeCsvImport(
    rawCsvLines: string[][],
    settings: CsvImportSettings,
    appBounds: AppBounds,
    existingHashes: Set<string> = new Set()
): ImportEngineResult {
    const { dateIdx, conceptIdx, amountIdx, balanceIdx, invertAmount } = settings;

    // -----------------------------------------------------------------
    // FASE 0: PARSEO DE TODAS LAS FILAS BRUTAS DEL CSV
    // -----------------------------------------------------------------
    const allParsedRows: ParsedTxRow[] = [];

    rawCsvLines.forEach((cols, idx) => {
        const rawDate = cols[dateIdx];
        if (!rawDate) return;

        const cleanDateStr = rawDate.replace(/[^\d/]/g, '').trim();
        const parts = cleanDateStr.split('/');
        if (parts.length !== 3) return;

        const year = parts[2];
        const month = parts[1].padStart(2, '0');
        const day = parts[0].padStart(2, '0');
        const dbDateStr = `${year}-${month}-${day}`;
        const displayDate = `${day}/${month}/${year}`;

        let amNum = parseSpanishFloat(cols[amountIdx]);
        if (invertAmount) amNum = amNum * -1;

        const balNum = balanceIdx !== -1 && cols[balanceIdx] ? parseSpanishFloat(cols[balanceIdx]) : null;
        const concept = cols[conceptIdx] || 'Movimiento importado';

        const hash = `${dbDateStr}_${Number(amNum).toFixed(2)}_${Number(balNum ?? 0).toFixed(2)}`;

        allParsedRows.push({
            dateStr: dbDateStr,
            displayDate,
            concept,
            amount: amNum,
            bank_balance: balNum,
            rawIndex: idx,
            hash
        });
    });

    const totalCsvRows = allParsedRows.length;

    if (totalCsvRows === 0) {
        return {
            scenario: 'ALL_DUPLICATED',
            realMode: 'none',
            rowsToInsert: [],
            isBlocked: true,
            bannerType: 'warning',
            bannerTitle: 'Archivo Vacío o Sin Formato',
            bannerMessage: 'No se han podido interpretar filas con formato de fecha e importe válido.',
            totalCsvRows: 0,
            dupesCount: 0,
            unmatchedInBetweenCount: 0
        };
    }

    // Detección automática de la orientación del CSV (descendente vs ascendente)
    const isDescending = totalCsvRows > 1 
        ? allParsedRows[0].dateStr > allParsedRows[totalCsvRows - 1].dateStr
        : settings.fileOrder === 'newest_first';

    // -----------------------------------------------------------------
    // FASE 1: DESCARTE POR HASH EXACTO (DUPLICADOS CONOCIDOS)
    // -----------------------------------------------------------------
    let dupesCount = 0;
    const rowsWithoutHashDupes: ParsedTxRow[] = [];

    allParsedRows.forEach(row => {
        if (existingHashes.has(row.hash)) {
            dupesCount++;
        } else {
            rowsWithoutHashDupes.push(row);
        }
    });

    // Si todas las filas existen en BBDD
    if (rowsWithoutHashDupes.length === 0) {
        return {
            scenario: 'ALL_DUPLICATED',
            realMode: 'none',
            rowsToInsert: [],
            isBlocked: true,
            bannerType: 'warning',
            bannerTitle: 'Extracto Totalmente Importado',
            bannerMessage: `Todos los ${totalCsvRows} movimientos de este archivo ya existen registrados en la base de datos.`,
            totalCsvRows,
            dupesCount,
            unmatchedInBetweenCount: 0
        };
    }

    // Ordenamos cronológicamente todas las filas válidas no duplicadas
    const sortedAllToInsert = sortChronologically(rowsWithoutHashDupes, isDescending);

    // -----------------------------------------------------------------
    // FASE 2: CLASIFICACIÓN Y CONTINUIDAD DE SALDOS
    // -----------------------------------------------------------------
    const dateAppNewest = parseToDate(appBounds.appNewestDate);

    // ESCENARIO A: App vacía
    if (!dateAppNewest) {
        return {
            scenario: 'EMPTY_APP',
            realMode: 'new',
            rowsToInsert: sortedAllToInsert,
            isBlocked: false,
            bannerType: 'info',
            bannerTitle: 'Primera Importación de la Cuenta',
            bannerMessage: `Se van a importar ${sortedAllToInsert.length} movimientos. Este extracto establecerá el saldo inicial y actual.`,
            totalCsvRows,
            dupesCount,
            unmatchedInBetweenCount: 0
        };
    }

    // Verificación de Saldo con la primera transacción cronológica del nuevo lote
    const firstChronologicalTx = sortedAllToInsert[0];

    if (firstChronologicalTx && firstChronologicalTx.bank_balance !== null) {
        const aperturaCsv = Math.round((firstChronologicalTx.bank_balance * 100) - (firstChronologicalTx.amount * 100)) / 100;
        const appBalance = appBounds.appCurrentBalance;

        // Si la cuenta ya tenía datos y el saldo no encaja
        if (appBounds.appCurrentBalance !== 0 && aperturaCsv !== appBalance) {
            return {
                scenario: 'GAP_DETECTED',
                realMode: 'new',
                rowsToInsert: sortedAllToInsert,
                isBlocked: true,
                bannerType: 'error',
                bannerTitle: 'Bloqueo de Seguridad: Hueco en el Presente',
                bannerMessage: `La app cerró en ${appBalance.toFixed(2)} €, pero este archivo requiere empezar en ${aperturaCsv.toFixed(2)} €. Faltan movimientos intermedios.`,
                totalCsvRows,
                dupesCount,
                unmatchedInBetweenCount: 0,
                expectedBalance: appBalance,
                actualFileBalance: aperturaCsv
            };
        }
    }

    let msg = `Continuidad confirmada. Se importarán ${sortedAllToInsert.length} movimientos correctamente.`;
    if (dupesCount > 0) msg += ` (Se omitieron ${dupesCount} duplicados exactos).`;

    return {
        scenario: 'NEW',
        realMode: 'new',
        rowsToInsert: sortedAllToInsert,
        isBlocked: false,
        bannerType: 'success',
        bannerTitle: 'Importación Lista',
        bannerMessage: msg,
        totalCsvRows,
        dupesCount,
        unmatchedInBetweenCount: 0
    };
}