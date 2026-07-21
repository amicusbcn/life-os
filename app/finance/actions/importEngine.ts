// app/finance/lib/importEngine.ts

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
    | 'ALL_DUPLICATED'     // B1: Extracto de en medio / duplicado entero
    | 'NEW'                // B3: Solo movimientos futuros
    | 'HISTORIC'           // B4: Solo movimientos pasados
    | 'SANDWICH'           // B2: Trae pasado Y futuro a la vez
    | 'GAP_DETECTED';      // Descuadre en semáforo de saldos

export interface ImportEngineResult {
    scenario: ImportScenario;
    realMode: 'new' | 'historic' | 'sandwich' | 'none';
    rowsToInsert: ParsedTxRow[];
    isBlocked: boolean;
    bannerType: 'success' | 'warning' | 'error' | 'info';
    bannerTitle: string;
    bannerMessage: string;
    
    // METRICAS DE TRANSPARENCIA
    totalCsvRows: number;
    dupesCount: number;                  // Filas ignoradas por Hash exacto en BBDD
    unmatchedInBetweenCount: number;     // Filas de en medio que no existen en BBDD
    
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
 * Ordena filas cronológicamente (de más antigua a más reciente).
 * Si coinciden las fechas en un CSV descendente (más reciente arriba),
 * la fila con mayor rawIndex es la operación MÁS ANTIGUA del día.
 */
function sortChronologically(rows: ParsedTxRow[], isDescending: boolean): ParsedTxRow[] {
    return [...rows].sort((a, b) => {
        const timeA = parseToDate(a.displayDate)?.getTime() || 0;
        const timeB = parseToDate(b.displayDate)?.getTime() || 0;

        if (timeA !== timeB) {
            return timeA - timeB; // Fecha ascendente
        }

        // Si la fecha es idéntica:
        // En un CSV descendente, mayor rawIndex = operación más antigua del día
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

    // Detección del sentido del archivo CSV (descendente vs ascendente)
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

    // -----------------------------------------------------------------
    // FASE 2: CLASIFICACIÓN DE BLOQUES SEGÚN ESTADO DE LA APP
    // -----------------------------------------------------------------
    const dateAppNewest = parseToDate(appBounds.appNewestDate);
    const dateAppOldest = parseToDate(appBounds.appOldestDate);

    // ESCENARIO A: App totalmente vacía
    if (!dateAppNewest || !dateAppOldest) {
        const sortedChrono = sortChronologically(rowsWithoutHashDupes, isDescending);
        return {
            scenario: 'EMPTY_APP',
            realMode: 'new',
            rowsToInsert: sortedChrono,
            isBlocked: false,
            bannerType: 'info',
            bannerTitle: 'Primera Importación de la Cuenta',
            bannerMessage: `Se van a importar ${sortedChrono.length} movimientos. Este extracto establecerá los cimientos y el saldo actual de la cuenta.`,
            totalCsvRows,
            dupesCount,
            unmatchedInBetweenCount: 0
        };
    }

    // Clasificación por rangos temporales
    const futureRows: ParsedTxRow[] = [];
    const pastRows: ParsedTxRow[] = [];
    const unmatchedInBetweenRows: ParsedTxRow[] = [];

    rowsWithoutHashDupes.forEach(r => {
        const d = parseToDate(r.displayDate);
        if (!d) return;

        if (d > dateAppNewest) {
            futureRows.push(r);
        } else if (d < dateAppOldest) {
            pastRows.push(r);
        } else {
            unmatchedInBetweenRows.push(r);
        }
    });

    const unmatchedInBetweenCount = unmatchedInBetweenRows.length;

    // ESCENARIO B1: Extracto de en medio o sin novedades
    if (futureRows.length === 0 && pastRows.length === 0) {
        let msg = 'Todos los movimientos de este archivo ya existen en tu aplicación o caen dentro del periodo procesado.';
        if (unmatchedInBetweenCount > 0) {
            msg += ` ⚠️ Atención: Se han omitido ${unmatchedInBetweenCount} movimiento(s) intermedio(s) no registrados previamente para proteger la coherencia de saldos. Usa la herramienta de Reconciliación para insertarlos.`;
        }

        return {
            scenario: 'ALL_DUPLICATED',
            realMode: 'none',
            rowsToInsert: [],
            isBlocked: true,
            bannerType: 'warning',
            bannerTitle: 'Extracto Sin Novedades Fuera del Rango',
            bannerMessage: msg,
            totalCsvRows,
            dupesCount,
            unmatchedInBetweenCount
        };
    }

    // -----------------------------------------------------------------
    // FASE 3: EVALUACIÓN DE CONTINUIDAD DE SALDOS
    // -----------------------------------------------------------------

    // ESCENARIO B3: Solo Futuro
    if (futureRows.length > 0 && pastRows.length === 0) {
        const sortedFuture = sortChronologically(futureRows, isDescending);
        const firstNewTx = sortedFuture[0];

        if (firstNewTx && firstNewTx.bank_balance !== null) {
            const aperturaCsv = Math.round((firstNewTx.bank_balance * 100) - (firstNewTx.amount * 100)) / 100;
            const appBalance = appBounds.appCurrentBalance;

            if (aperturaCsv !== appBalance) {
                return {
                    scenario: 'GAP_DETECTED',
                    realMode: 'new',
                    rowsToInsert: sortedFuture,
                    isBlocked: true,
                    bannerType: 'error',
                    bannerTitle: 'Bloqueo de Seguridad: Hueco en el Presente',
                    bannerMessage: `La app cerró en ${appBalance.toFixed(2)} €, pero este archivo requiere empezar en ${aperturaCsv.toFixed(2)} €. Faltan movimientos intermedios.`,
                    totalCsvRows,
                    dupesCount,
                    unmatchedInBetweenCount,
                    expectedBalance: appBalance,
                    actualFileBalance: aperturaCsv
                };
            }
        }

        let msg = `El extracto engancha perfectamente con el saldo actual (${appBounds.appCurrentBalance.toFixed(2)} €). Se importarán ${sortedFuture.length} movimientos nuevos.`;
        if (dupesCount > 0) msg += ` (Se omitieron ${dupesCount} duplicados exactos).`;

        return {
            scenario: 'NEW',
            realMode: 'new',
            rowsToInsert: sortedFuture,
            isBlocked: false,
            bannerType: 'success',
            bannerTitle: 'Continuidad Temporal Confirmada',
            bannerMessage: msg,
            totalCsvRows,
            dupesCount,
            unmatchedInBetweenCount
        };
    }

    // ESCENARIO B4: Solo Pasado
    if (pastRows.length > 0 && futureRows.length === 0) {
        const sortedPastChrono = sortChronologically(pastRows, isDescending);
        const lastPastTx = sortedPastChrono[sortedPastChrono.length - 1]; // Última transacción del pasado

        if (lastPastTx && lastPastTx.bank_balance !== null) {
            const cierreCsvPast = lastPastTx.bank_balance;
            const appInitial = appBounds.appInitialBalance;

            if (cierreCsvPast !== appInitial) {
                return {
                    scenario: 'GAP_DETECTED',
                    realMode: 'historic',
                    rowsToInsert: sortedPastChrono,
                    isBlocked: true,
                    bannerType: 'error',
                    bannerTitle: 'Bloqueo de Seguridad: Hueco en el Histórico',
                    bannerMessage: `El cimiento de tu app abre en ${appInitial.toFixed(2)} €, pero este archivo histórico termina dejando un saldo de ${cierreCsvPast.toFixed(2)} €.`,
                    totalCsvRows,
                    dupesCount,
                    unmatchedInBetweenCount,
                    expectedBalance: appInitial,
                    actualFileBalance: cierreCsvPast
                };
            }
        }

        let msg = `El pasado encaja exactamente con los cimientos de tu app (${appBounds.appInitialBalance.toFixed(2)} €). Se añadirán ${sortedPastChrono.length} movimientos históricos.`;
        if (dupesCount > 0) msg += ` (Se omitieron ${dupesCount} duplicados exactos).`;

        return {
            scenario: 'HISTORIC',
            realMode: 'historic',
            rowsToInsert: sortedPastChrono,
            isBlocked: false,
            bannerType: 'success',
            bannerTitle: 'Continuidad Histórica Confirmada',
            bannerMessage: msg,
            totalCsvRows,
            dupesCount,
            unmatchedInBetweenCount
        };
    }

    // ESCENARIO B2: Sándwich
    const validSandwichRows = sortChronologically([...futureRows, ...pastRows], isDescending);
    return {
        scenario: 'SANDWICH',
        realMode: 'sandwich',
        rowsToInsert: validSandwichRows,
        isBlocked: false,
        bannerType: 'success',
        bannerTitle: 'Extracto Combinado (Pasado y Futuro)',
        bannerMessage: `Se han detectado ${futureRows.length} movimientos nuevos del futuro y ${pastRows.length} del pasado. (${dupesCount} duplicados exactos descartados).`,
        totalCsvRows,
        dupesCount,
        unmatchedInBetweenCount
    };
}