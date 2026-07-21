// app/finance/actions/importers.ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/*
 * Obtiene los extremos de fechas y saldos dinámicos de la cuenta desde finance_transactions
 */
export async function getAccountFileLimitsAction(account_id: string) {
    const supabase = await createClient();

    try {
        // 1. Movimiento más reciente (Techo de la App)
        const { data: lastTx } = await supabase
            .from('finance_transactions')
            .select('date, bank_balance, amount')
            .eq('account_id', account_id)
            .order('date', { ascending: false })
            .order('import_sequence', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1);

        // 2. Movimiento más antiguo (Cimiento de la App)
        const { data: firstTx } = await supabase
            .from('finance_transactions')
            .select('date, bank_balance, amount')
            .eq('account_id', account_id)
            .order('date', { ascending: true })
            .order('import_sequence', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(1);

        const hasTx = lastTx && lastTx.length > 0 && firstTx && firstTx.length > 0;

        const newestDateStr = hasTx ? lastTx[0].date : null;
        const oldestDateStr = hasTx ? firstTx[0].date : null;

        // Saldo actual en App = Saldo de banco registrado en el movimiento más reciente
        const appCurrentBalance = hasTx && lastTx[0].bank_balance !== null ? lastTx[0].bank_balance : 0;

        // Saldo inicial en App = Saldo de apertura del movimiento más antiguo (bank_balance - amount)
        const appInitialBalance = hasTx && firstTx[0].bank_balance !== null 
            ? (Math.round(firstTx[0].bank_balance * 100) - Math.round(firstTx[0].amount * 100)) / 100 
            : 0;

        const formatToDisplay = (dStr: string | null) => {
            if (!dStr) return null;
            const parts = dStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dStr;
        };

        return {
            success: true,
            newestDate: formatToDisplay(newestDateStr),
            oldestDate: formatToDisplay(oldestDateStr),
            currentBalance: appCurrentBalance,
            initialBalance: appInitialBalance
        };
    } catch (err: any) {
        console.error('Error en getAccountFileLimitsAction:', err);
        return { success: false, error: err.message || 'Error al obtener límites de la cuenta' };
    }
}

/**
 * Procesa e inserta las transacciones del CSV detectando automáticamente 
 * si el archivo está ordenado de forma ASCENDENTE o DESCENDENTE.
 */
export async function importCsvTransactionsAction(formData: FormData, config: any) {
    const supabase = await createClient();

    // 1. OBTENCIÓN Y VALIDACIÓN DE PARÁMETROS
    const file = formData.get('file') as File;
    const account_id = formData.get('accountId') as string;
    const invertAmount = formData.get('invertAmount') === 'true';

    if (!file || !account_id) {
        return { success: false, error: 'Faltan parámetros obligatorios (Archivo o Cuenta)' };
    }

    try {
        const userResponse = await supabase.auth.getUser();
        const user = userResponse.data.user;
        if (!user) return { success: false, error: 'Usuario no autenticado' };

        // 2. REGISTRO INICIAL DE AUDITORÍA
        const { data: importerLog, error: logError } = await supabase
            .from('finance_importers')
            .insert({
                user_id: user.id,
                account_id,
                filename: file.name,
                row_count: 0,
                skipped_count: 0,
                import_date: new Date().toISOString()
            })
            .select()
            .single();

        if (logError || !importerLog) {
            return { success: false, error: `Error al registrar log de importación: ${logError?.message}` };
        }

        // 3. LECTURA Y PARSEO DE LÍNEAS
        const text = await file.text();
        const delimiter = config?.delimiter || ';';
        const lines = text.split('\n');

        const { column_map } = config.settings;
        const dateIdx = column_map.date;
        const conceptIdx = column_map.concept;
        const amountIdx = column_map.amount;
        const balanceIdx = column_map.bank_balance;

        const parseSpanishFloat = (str: string) => {
            if (!str) return 0;
            let n = str.trim();
            if (n.includes('.') && !n.includes(',')) return parseFloat(n) || 0;
            const clean = n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
            return parseFloat(clean) || 0;
        };

        let rawTransactions: Array<{
            dateStr: string;
            concept: string;
            amount: number;
            bank_balance: number | null;
        }> = [];

        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed.length < 10 || trimmed.startsWith('---')) continue;
            const columns = trimmed.split(delimiter).map(c => c.trim().replace(/"/g, ''));

            // Ignorar cabeceras
            if (columns.some(c => {
                const h = c.toLowerCase();
                return h.includes('importe') || h.includes('fecha') || h.includes('date');
            })) continue;

            const rawDate = columns[dateIdx];
            if (!rawDate) continue;

            const cleanDateStr = rawDate.replace(/[^\d/]/g, '').trim();
            const parts = cleanDateStr.split('/');
            if (parts.length !== 3) continue;

            const dbDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            let amNum = parseSpanishFloat(columns[amountIdx]);
            if (invertAmount) amNum = amNum * -1;

            const balNum = balanceIdx !== -1 && columns[balanceIdx] ? parseSpanishFloat(columns[balanceIdx]) : null;
            const concept = columns[conceptIdx] || 'Movimiento importado';

            rawTransactions.push({
                dateStr: dbDateStr,
                concept,
                amount: amNum,
                bank_balance: balNum
            });
        }

        if (rawTransactions.length === 0) {
            await supabase.from('finance_importers').delete().eq('id', importerLog.id);
            return { success: false, error: 'No se encontraron filas válidas para procesar.' };
        }

        // 4. DETECCION AUTOMÁTICA DEL SENTIDO DEL CSV (ASCENDENTE vs DESCENDENTE)
        const firstDate = rawTransactions[0].dateStr;
        const lastDate = rawTransactions[rawTransactions.length - 1].dateStr;

        // Si la primera fila es posterior a la última, el CSV es DESCENDENTE (más reciente arriba)
        // Invertimos la lista para procesar en estricto orden cronológico (de más antiguo a más reciente)
        if (firstDate > lastDate) {
            rawTransactions.reverse();
        } else if (firstDate === lastDate && rawTransactions.length > 1) {
            // Si todas son del mismo día y hay saldo, verificamos la tendencia de balance
            const bFirst = rawTransactions[0].bank_balance;
            const bLast = rawTransactions[rawTransactions.length - 1].bank_balance;
            if (bFirst !== null && bLast !== null) {
                // Si el saldo de la primera fila incluye los movimientos posteriores, invertimos
                if (Math.abs(bFirst - rawTransactions[0].amount - bLast) < 0.05) {
                    rawTransactions.reverse();
                }
            }
        }

        // 5. RECUPERAMOS HASHES DE TRANSACCIONES EXISTENTES EN BBDD
        const { data: existingDbTxs } = await supabase
            .from('finance_transactions')
            .select('date, amount, bank_balance')
            .eq('account_id', account_id);

        const existingHashes = new Set<string>();
        existingDbTxs?.forEach(tx => {
            const h = `${tx.date}_${Number(tx.amount).toFixed(2)}_${Number(tx.bank_balance ?? 0).toFixed(2)}`;
            existingHashes.add(h);
        });

        // 6. OBTENER ÚLTIMO SALDO REGISTRADO PARA ESTA CUENTA (Por si faltan saldos en tarjetas)
        const { data: lastTx } = await supabase
            .from('finance_transactions')
            .select('bank_balance')
            .eq('account_id', account_id)
            .not('bank_balance', 'is', null)
            .order('date', { ascending: false })
            .order('import_sequence', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let runningBalance = lastTx?.bank_balance ? Number(lastTx.bank_balance) : 0;

        // 7. ASIGNACIÓN CRONOLÓGICA DE SEQUENCES Y SALDOS ACUMULADOS
        const rowsToInsert: any[] = [];
        let skippedCount = 0;

        rawTransactions.forEach((t) => {
            let rowBalance: number;

            if (t.bank_balance !== null && t.bank_balance !== undefined) {
                rowBalance = t.bank_balance;
                runningBalance = rowBalance;
            } else {
                runningBalance = Number((runningBalance + t.amount).toFixed(2));
                rowBalance = runningBalance;
            }

            const hash = `${t.dateStr}_${Number(t.amount).toFixed(2)}_${Number(rowBalance).toFixed(2)}`;

            if (existingHashes.has(hash)) {
                skippedCount++;
            } else {
                rowsToInsert.push({
                    account_id,
                    user_id: user.id,
                    importer_id: importerLog.id,
                    date: t.dateStr,
                    concept: t.concept,
                    amount: t.amount,
                    bank_balance: rowBalance,
                    import_sequence: rowsToInsert.length + 1 // Garantiza el orden cronológico estricto
                });
            }
        });

        if (rowsToInsert.length === 0) {
            await supabase.from('finance_importers').delete().eq('id', importerLog.id);
            return { 
                success: true, 
                message: 'Todos los movimientos ya existían en la base de datos.',
                insertedCount: 0,
                skippedCount
            };
        }

        // 8. INSERCIÓN EN BBDD Y ACTUALIZACIÓN DEL LOG DE AUDITORÍA
        const { error: insertError } = await supabase
            .from('finance_transactions')
            .insert(rowsToInsert);

        if (insertError) {
            await supabase.from('finance_importers').delete().eq('id', importerLog.id);
            return { success: false, error: `Error al insertar movimientos: ${insertError.message}` };
        }

        await supabase
            .from('finance_importers')
            .update({ 
                row_count: rowsToInsert.length,
                skipped_count: skippedCount
            })
            .eq('id', importerLog.id);

        revalidatePath('/finance/imports');
        revalidatePath('/finance');

        return { 
            success: true, 
            count: rowsToInsert.length,
            skippedCount
        };

    } catch (err: any) {
        console.error('Error en importCsvTransactionsAction:', err);
        return { success: false, error: err.message || 'Error interno del servidor' };
    }
}

/**
 * Elimina un lote completo de importación y todas sus transacciones asociadas (Rollback)
 */
export async function deleteImportBatchAction(importId: string) {
    const supabase = await createClient();

    try {
        // 1. Eliminamos primero la cabecera en finance_importers.
        // Esto desactiva el bloqueo del trigger fn_protect_imported_transactions para este lote.
        const { error: importError } = await supabase
            .from('finance_importers')
            .delete()
            .eq('id', importId);

        if (importError) throw new Error(`Error al eliminar registro de importación: ${importError.message}`);

        // 2. Eliminamos las transacciones vinculadas al lote
        const { error: txError } = await supabase
            .from('finance_transactions')
            .delete()
            .eq('importer_id', importId);

        if (txError) throw new Error(`Error al eliminar transacciones del lote: ${txError.message}`);

        // 3. Revalidamos cachés de Next.js
        revalidatePath('/finance/imports');
        revalidatePath('/finance');

        return { 
            success: true, 
            message: 'Importación y transacciones asociadas eliminadas correctamente.' 
        };
    } catch (err: any) {
        console.error('Error en deleteImportBatchAction:', err);
        return { success: false, error: err.message || 'Error al deshacer la importación' };
    }
}

/**
 * Renombra un lote de importación
 */
export async function renameImportBatchAction(importId: string, newFilename: string) {
    const supabase = await createClient();

    if (!newFilename || newFilename.trim() === '') {
        return { success: false, error: 'El nombre no puede estar vacío.' };
    }

    try {
        const { error } = await supabase
            .from('finance_importers')
            .update({ filename: newFilename.trim() })
            .eq('id', importId);

        if (error) throw new Error(error.message);

        revalidatePath('/finance/imports');
        return { success: true, message: 'Lote renombrado correctamente.' };
    } catch (err: any) {
        console.error('Error en renameImportBatchAction:', err);
        return { success: false, error: err.message || 'Error al renombrar el lote.' };
    }
}

export interface ReorderItem {
    id: string;
    import_sequence: number;
}

/**
 * Reordena masivamente las transacciones de un lote concreto de importación
 */
export async function reorderBatchTransactionsAction(batchId: string, items: ReorderItem[]) {
    const supabase = await createClient();

    if (!items || items.length === 0) {
        return { success: false, error: 'No hay elementos para reordenar.' };
    }

    try {
        const updates = items.map(item => 
            supabase
                .from('finance_transactions')
                .update({ import_sequence: item.import_sequence })
                .eq('id', item.id)
                .eq('importer_id', batchId)
        );

        const results = await Promise.all(updates);
        const hasError = results.some(r => r.error);

        if (hasError) {
            throw new Error('Ocurrió un error al actualizar algunas posiciones.');
        }

        revalidatePath(`/finance/imports/${batchId}`);
        revalidatePath('/finance/imports');
        revalidatePath('/finance');

        return { success: true, message: 'Orden de transacciones guardado correctamente.' };
    } catch (err: any) {
        console.error('Error en reorderBatchTransactionsAction:', err);
        return { success: false, error: err.message || 'Error al reordenar el lote.' };
    }
}