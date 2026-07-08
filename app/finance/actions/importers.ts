'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/types/common'
import {  FinanceImporter, ParsedTransaction } from '@/types/finance'; 
import * as csv from 'csv-parser'; 
import { Readable } from 'stream'; 


export async function importCsvTransactionsAction(
    formData: FormData,
    mappingConfig: { delimiter: string; settings: any }, // 💡 Pasamos el mapping temporal limpio directamente como objeto
): Promise<{ success: boolean; error?: string; transactionsCount?: number; autoCategorizedCount?: number }> {

    try {
        const file = formData.get('file') as File | null;
        const account_id = formData.get('accountId') as string;
        const invertAmountManual = formData.get('invertAmount') === 'true';
        const importMode = formData.get('importMode') as 'new' | 'historic';
        const fileOrder = formData.get('fileOrder') as 'newest_first' | 'oldest_first' || 'newest_first';

        if (!file) return { success: false, error: 'No se ha subido ningún archivo.' };

        const supabase = await createClient();
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) return { success: false, error: 'No autorizado.' };

        // 1. CREAMOS EL REGISTRO DE LOG EN EL HISTORIAL USANDO LA ESTRUCTURA DE FINANCEIMPORTER
        const { data: logRecord, error: logError } = await supabase
            .from('finance_importers')
            .insert({
                name: `Importación: ${file.name}`,
                delimiter: mappingConfig.delimiter || ';',
                settings: mappingConfig.settings || {},
                user_id: userData.user.id,
                row_count: 0 // Se actualizará al final tras la inserción real
            })
            .select()
            .single();

        if (logError || !logRecord) {
            return { success: false, error: `Error al crear el registro histórico: ${logError?.message}` };
        }

        // Tipo asignado formalmente al registro recuperado
        const importerLog: FinanceImporter = logRecord;

        // 2. Lectura del archivo CSV
        const bytes = await file.arrayBuffer();
        const content = new TextDecoder('utf-8').decode(bytes);
        
        const rawLines: string[][] = [];
        const delimiter = mappingConfig.delimiter || ';';

        const lines = content.split(/\r?\n/);
        lines.forEach(line => {
            if (line.trim()) {
                const cols = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
                rawLines.push(cols);
            }
        });

        if (rawLines.length < 2) {
            await supabase.from('finance_importers').delete().eq('id', importerLog.id);
            return { success: false, error: 'El archivo CSV está vacío o no contiene suficientes filas.' };
        }

        const csvRowsData = rawLines.slice(1); 
        const s = mappingConfig.settings;
        if (!s) {
            await supabase.from('finance_importers').delete().eq('id', importerLog.id);
            return { success: false, error: 'Configuración de mapeo ausente.' };
        }

        const dateIdx = s.column_map.date;
        const conceptIdx = s.column_map.concept;
        const balIdx = s.column_map.bank_balance;
        const amIdx = s.column_map.amount;
        const chargeIdx = s.has_two_columns ? s.column_map.charge : -1;
        const creditIdx = s.has_two_columns ? s.column_map.credit : -1;

        const parseSpanishFloat = (str: string) => {
            if (!str) return 0;
            let n = str.trim();
            if (n.includes('.') && !n.includes(',')) return parseFloat(n) || 0;
            const clean = n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
            return parseFloat(clean) || 0;
        };

        const transactions: any[] = [];

        // 3. Mapeo síncrono del CSV
        csvRowsData.forEach((columns, index) => {
            const rawDate = columns[dateIdx];
            if (!rawDate) return;

            const parts = rawDate.split('/');
            if (parts.length !== 3) return;
            const dbDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;

            let amNum = 0;
            if (s.has_two_columns) {
                const charge = parseSpanishFloat(columns[chargeIdx]);
                const credit = parseSpanishFloat(columns[creditIdx]);
                amNum = credit - charge; 
            } else {
                amNum = parseSpanishFloat(columns[amIdx]);
            }

            if (invertAmountManual || s.invert_sign) {
                amNum = amNum * -1;
            }

            const balNum = balIdx !== -1 && columns[balIdx] ? parseSpanishFloat(columns[balIdx]) : null;

            let seq = index;
            if (fileOrder === 'newest_first') {
                seq = csvRowsData.length - 1 - index;
            }

            transactions.push({
                date: dbDateStr,
                concept: columns[conceptIdx] || 'Movimiento importado',
                amount: amNum,
                bank_balance: balNum,
                import_sequence: seq
            });
        });

        // ========================================================
        // 4. BÚNKER DE FILTRADO ANTIDUPLICADOS POR HASH EXACTO
        // ========================================================
        const { data: existingTx } = await supabase
            .from('finance_transactions')
            .select('date, amount, bank_balance')
            .eq('account_id', account_id);

        const existingTxHashes = new Set<string>();
        if (existingTx) {
            existingTx.forEach(t => {
                const hash = `${t.date}_${Number(t.amount).toFixed(2)}_${Number(t.bank_balance ?? 0).toFixed(2)}`;
                existingTxHashes.add(hash);
            });
        }

        const finalTransactions: any[] = [];

        for (const t of transactions) {
            const csvTxHash = `${t.date}_${Number(t.amount).toFixed(2)}_${Number(t.bank_balance ?? 0).toFixed(2)}`;

            if (existingTxHashes.has(csvTxHash)) {
                continue; 
            }

            finalTransactions.push({
                account_id,
                user_id: userData.user.id,
                date: t.date,
                concept: t.concept,
                amount: t.amount,
                bank_balance: t.bank_balance,
                import_sequence: t.import_sequence,
                import_id: importerLog.id, // 💡 Asignamos el ID del log histórico legítimo
                category_id: null
            });
        }

        if (finalTransactions.length === 0) {
            await supabase.from('finance_importers').delete().eq('id', importerLog.id);
            return { 
                success: true, 
                transactionsCount: 0, 
                error: "ℹ️ Todos los movimientos del archivo ya están registrados en la app." 
            };
        }

        // ========================================================
        // 5. VALIDACIÓN DE CONTINUIDAD STRICTA (EVITAR HUECOS)
        // ========================================================
        const { data: lastAppTx } = await supabase
            .from('finance_transactions')
            .select('bank_balance, date')
            .eq('account_id', account_id)
            .order('date', { ascending: false })
            .order('import_sequence', { ascending: false })
            .limit(1);

        const { data: firstAppTx } = await supabase
            .from('finance_transactions')
            .select('bank_balance, date, amount')
            .eq('account_id', account_id)
            .order('date', { ascending: true })
            .order('import_sequence', { ascending: true })
            .limit(1);

        const ultimoSaldoApp = lastAppTx?.[0]?.bank_balance;
        const primerSaldoApp = firstAppTx?.[0]?.bank_balance;
        const primerImporteApp = firstAppTx?.[0]?.amount;

        if (importMode === 'new' && ultimoSaldoApp !== undefined && ultimoSaldoApp !== null) {
            const cronoTransactions = [...finalTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.import_sequence - b.import_sequence);
            const primerMovimientoNuevo = cronoTransactions[0];

            if (primerMovimientoNuevo && primerMovimientoNuevo.bank_balance !== null) {
                const saldoAperturaCsv = (Math.round(primerMovimientoNuevo.bank_balance * 100) - Math.round(primerMovimientoNuevo.amount * 100)) / 100;
                
                if (saldoAperturaCsv !== ultimoSaldoApp) {
                    await supabase.from('finance_importers').delete().eq('id', importerLog.id);
                    return {
                        success: false,
                        error: `❌ HUECO DETECTADO: La app cerró en ${ultimoSaldoApp} €, pero este archivo requiere empezar en ${saldoAperturaCsv} €. Faltan movimientos intermedios.`
                    };
                }
            }
        } 
        
        if (importMode === 'historic' && primerSaldoApp !== undefined && primerSaldoApp !== null && primerImporteApp !== undefined && primerImporteApp !== null) {
            const cronoTransactionsDesc = [...finalTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.import_sequence - a.import_sequence);
            const ultimoMovimientoHistorico = cronoTransactionsDesc[0];

            if (ultimoMovimientoHistorico && ultimoMovimientoHistorico.bank_balance !== null) {
                const saldoAperturaActualApp = (Math.round(primerSaldoApp * 100) - Math.round(primerImporteApp * 100)) / 100;
                const saldoCierreCsvHistorico = ultimoMovimientoHistorico.bank_balance;

                if (saldoCierreCsvHistorico !== saldoAperturaActualApp) {
                    await supabase.from('finance_importers').delete().eq('id', importerLog.id);
                    return {
                        success: false,
                        error: `❌ HUECO HISTÓRICO DETECTADO: El cimiento de tu app arranca en ${saldoAperturaActualApp} €, pero este archivo histórico termina dejando un saldo de ${saldoCierreCsvHistorico} €. Revisa la continuidad hacia atrás.`
                    };
                }
            }
        }

        // 6. INSERCIÓN ATÓMICA DE LAS FILAS DEPURADAS
        const { error: insertError } = await supabase.from('finance_transactions').insert(finalTransactions);
        if (insertError) {
            await supabase.from('finance_importers').delete().eq('id', importerLog.id);
            return { success: false, error: `Error en Base de Datos: ${insertError.message}` };
        }

        // 7. ACTUALIZAMOS EL ROW_COUNT REAL EN EL LOG DE IMPORTACIÓN
        await supabase
            .from('finance_importers')
            .update({ row_count: finalTransactions.length })
            .eq('id', importerLog.id);

        revalidatePath('/finance');

        return {
            success: true,
            transactionsCount: finalTransactions.length,
            autoCategorizedCount: 0
        };

    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Error interno crítico en el servidor.' };
    }
}

// ÚNICA IMPLEMENTACIÓN DE LÍMITES TEMPORALES (Limpiadas las copias extra del fondo)
export async function getAccountFileLimitsAction(accountId: string): Promise<{
    success: boolean;
    newestDate?: string;
    oldestDate?: string;
    error?: string;
}> {
    try {
        const supabase = await createClient();

        const { data: recentData, error: err1 } = await supabase
            .from('finance_transactions')
            .select('date')
            .eq('account_id', accountId)
            .order('date', { ascending: false })
            .order('import_sequence', { ascending: false })
            .limit(1);

        const { data: oldestData, error: err2 } = await supabase
            .from('finance_transactions')
            .select('date')
            .eq('account_id', accountId)
            .order('date', { ascending: true })
            .order('import_sequence', { ascending: true })
            .limit(1);

        if (err1 || err2) return { success: false, error: 'Error al consultar extremos.' };

        const formatDate = (dbDate?: string) => {
            if (!dbDate) return 'Sin movimientos';
            const [y, m, d] = dbDate.split('-');
            return `${d}/${m}/${y}`;
        };

        return {
            success: true,
            newestDate: formatDate(recentData?.[0]?.date),
            oldestDate: formatDate(oldestData?.[0]?.date),
        };
    } catch (e) {
        return { success: false, error: 'Error interno' };
    }
}


export async function processImportAction(transactions: any[], accountId: string, userId: string) {
    const supabase = await createClient();
    
    const { data: oldestTx } = await supabase
        .from('finance_transactions')
        .select('date')
        .eq('account_id', accountId)
        .order('date', { ascending: true })
        .limit(1)
        .single();

    let initialBalanceAdjustment = 0;
    const finalTransactions = [];

    // REGLA DE NEGOCIO: Al procesar arrays inyectados manualmente desde fuera, inyectamos también la secuencia ordenada
    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        if (oldestTx && new Date(tx.date) < new Date(oldestTx.date)) {
            initialBalanceAdjustment += tx.amount;
        }
        finalTransactions.push({ 
            ...tx, 
            account_id: accountId, 
            user_id: userId,
            import_sequence: i // Guardamos posición ordinal
        });
    }

    if (initialBalanceAdjustment !== 0) {
        const { data: account } = await supabase
            .from('finance_accounts')
            .select('initial_balance')
            .eq('id', accountId)
            .single();

        if (account) {
            await supabase
                .from('finance_accounts')
                .update({ initial_balance: account.initial_balance + initialBalanceAdjustment })
                .eq('id', accountId);
        }
    }

    return await supabase.from('finance_transactions').insert(finalTransactions);
}

export async function validateAndImportAction(
    transactions: any[], 
    accountId: string, 
    userId: string,
    mode: 'new' | 'historic'
) {
    const supabase = await createClient();

    if (mode === 'historic') {
        const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0);
        
        const { data: account } = await supabase
            .from('finance_accounts')
            .select('initial_balance')
            .eq('id', accountId)
            .single();

        if (account) {
            await supabase
                .from('finance_accounts')
                .update({ initial_balance: account.initial_balance + totalAmount })
                .eq('id', accountId);
        }
    }

    // REGLA DE NEGOCIO: Aseguramos el orden secuencial intradiario mapeando el índice de la colección
    const finalTxs = transactions.map((t, idx) => ({ 
        ...t, 
        account_id: accountId, 
        user_id: userId,
        import_sequence: idx // Guardamos el orden relativo
    }));

    const { error } = await supabase
        .from('finance_transactions')
        .insert(finalTxs);

    if (error) return { success: false, error: error.message };

    revalidatePath('/finance');
    return { success: true };
}
