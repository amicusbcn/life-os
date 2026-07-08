'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/types/common'
import { ImporterTemplate, ParsedTransaction } from '@/types/finance'; 
import * as csv from 'csv-parser'; 
import { Readable } from 'stream'; 

export async function importCsvTransactionsAction(
    formData: FormData,
    template: Partial<ImporterTemplate>,
): Promise<{ success: boolean; error?: string; transactionsCount?: number; autoCategorizedCount?: number }> {

    try {
        const file = formData.get('file') as File | null;
        const account_id = formData.get('accountId') as string;
        const invertAmountManual = formData.get('invertAmount') === 'true';
        const saveAsTemplate = formData.get('saveAsTemplate') === 'true';
        const newTemplateName = formData.get('newTemplateName') as string;
        let templateId = formData.get('templateId') as string | null;
        const importMode = formData.get('importMode') as 'new' | 'historic';
        const fileOrder = formData.get('fileOrder') as 'newest_first' | 'oldest_first' || 'newest_first';

        if (!file) return { success: false, error: 'No se ha subido ningún archivo.' };

        const supabase = await createClient();
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData.user) return { success: false, error: 'Usuario no autenticado.' };

        const user_id = userData.user.id;

        // 1. OBTENER CUENTA
        const { data: account, error: accountError } = await supabase
            .from('finance_accounts')
            .select('id, account_type, current_balance')
            .eq('id', account_id)
            .single();

        if (accountError || !account) return { success: false, error: 'No se encontró la cuenta.' };

        const isCreditCard = account.account_type === 'credit_card';
        const { delimiter, mapping } = template as ImporterTemplate;

        // 2. GESTIÓN DE PLANTILLA (Si se crea una nueva)
        if (saveAsTemplate && newTemplateName && mapping) {
            const bufferTmp = await file.arrayBuffer();
            const contentTmp = Buffer.from(bufferTmp).toString('utf8');
            const firstLine = contentTmp.split(/\r?\n|\r/g)[0];
            const headersArr = firstLine.split(delimiter || ';').map(h => h.trim().replace(/"/g, ''));

            const columnMap = {
                date: headersArr.indexOf(mapping.operation_date),
                concept: headersArr.indexOf(mapping.concept),
                amount: headersArr.indexOf(mapping.amount),
                charge: null,
                credit: null
            };

            const { data: newT } = await supabase
                .from('finance_importer_templates')
                .insert({
                    name: newTemplateName,
                    user_id,
                    settings: { 
                        delimiter: delimiter || ';', 
                        skip_rows: 1, 
                        invert_sign: invertAmountManual, 
                        has_two_columns: false, 
                        column_map: columnMap 
                    }
                })
                .select().single();

            if (newT) {
                templateId = newT.id;
                await supabase.from('finance_accounts').update({ importer_id: newT.id }).eq('id', account_id);
            }
        }

        // 3. CREAR EL REGISTRO DE IMPORTACIÓN (EL PADRE) - Tabla Histórico
        const { data: importerRecord, error: importerError } = await supabase
            .from('finance_importers')
            .insert({
                user_id,
                account_id,
                template_id: (templateId && templateId !== 'none') ? templateId : null,
                filename: file.name,
                row_count: 0, 
                import_date: new Date().toISOString().split('T')[0]
            })
            .select().single();

        if (importerError || !importerRecord) return { success: false, error: 'Error al inicializar histórico.' };

        // 4. PROCESAMIENTO CSV
        const buffer = await file.arrayBuffer();
        const fileContent = Buffer.from(buffer).toString('utf8');
        const allLines = fileContent.split(/\r?\n|\r/g);
        
        const cleanedLines = allLines.filter(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0) return false;
            const fields = trimmedLine.split(delimiter);
            const hasContent = fields.some(field => field.trim().length > 0);
            const isUselessHeader = trimmedLine.toLowerCase().includes('movimientos de cuenta')
                || trimmedLine.startsWith('----')
                || trimmedLine.includes('saldo inicial');
            return hasContent && !isUselessHeader;
        });

        const cleanedStreamContent = cleanedLines.join('\n');
        const transactions: any[] = [];
        
        // REGLA DE NEGOCIO: Llevamos un contador incremental interno para guardar el orden físico exacto del CSV
        let sequenceCounter = 0; 

        try {
            const parser = csv.default({
                separator: delimiter || ';',
                mapHeaders: ({ header }: { header: string }) => header.trim().replace(/"/g, ''),
            });

            parser.on('data', (row: Record<string, string>) => {
                const mappedRow = mapCsvRow(row, mapping, account_id, user_id);
                if (mappedRow) {
                    if (invertAmountManual) mappedRow.amount *= -1;
                    
                    // Inyectamos la posición nativa de la fila antes de empujarla al array
                    transactions.push({
                        ...mappedRow,
                        import_sequence: sequenceCounter++ 
                    });
                }
            }).on('error', (error: Error) => {
                throw new Error(`Error al parsear: ${error.message}`);
            });

            parser.write(cleanedStreamContent);
            parser.end();
        } catch (e) {
            return { success: false, error: `Error procesando CSV: ${(e as Error).message}` };
        }

        // 💡 INVERSIÓN SENSATA DE LA SECUENCIA SEGÚN EL ORDEN DE LAS FECHAS
        // Si lo más nuevo está arriba en el archivo, invertimos la secuencia para que la base de datos ordene bien el tiempo
        if (fileOrder === 'newest_first') {
            const total = transactions.length;
            transactions.forEach((t, index) => {
                t.import_sequence = total - 1 - index;
            });
        }

        // 5. AUTO-CATEGORIZACIÓN Y ASIGNACIÓN DE IMPORTER_ID
        const { data: rules } = await supabase.from('finance_rules').select('pattern, category_id');
        let autoCategorizedCount = 0;

        const finalTransactions = transactions
            .filter(t => !(isCreditCard && t.concept.toUpperCase().includes('CAJERO')))
            .map(t => {
                let category_id = null;
                if (rules) {
                    const rule = rules.find(r => t.concept.toUpperCase().includes(r.pattern.toUpperCase()));
                    if (rule) { category_id = rule.category_id; autoCategorizedCount++; }
                }
                return {
                    ...t,
                    account_id,
                    user_id,
                    category_id,
                    importer_id: importerRecord.id // Vínculo al registro de histórico
                };
            });

        // 6. INSERCIÓN FINAL Y ACTUALIZACIÓN
        const { error: insertError } = await supabase.from('finance_transactions').insert(finalTransactions);
        
        if (insertError) {
            await supabase.from('finance_importers').delete().eq('id', importerRecord.id);
            return { success: false, error: `Error al guardar: ${insertError.message}` };
        }

        // 💡 ACTUALIZACIÓN DEL SALDO DE LA CUENTA SEGÚN TUS DOS PREMISAS MÁXIMAS
        if (importMode === 'new' && finalTransactions.length > 0) {
            // Buscamos la transacción con la secuencia más alta (la última cronológicamente)
            const sortedBySeq = [...finalTransactions].sort((a, b) => b.import_sequence - a.import_sequence);
            const lastCronTx = sortedBySeq[0];

            if (lastCronTx && lastCronTx.bank_balance !== null && lastCronTx.bank_balance !== undefined) {
                // ESCENARIO A (Cuenta Corriente): El saldo definitivo del banco manda por decreto
                await supabase
                    .from('finance_accounts')
                    .update({ current_balance: lastCronTx.bank_balance })
                    .eq('id', account_id);
            } else {
                // ESCENARIO B (Tarjetas/Sin Saldo): Hacemos el sumatorio incremental sobre el saldo de la app
                const netoImportacion = finalTransactions.reduce((sum, t) => sum + t.amount, 0);
                const nuevoSaldoCalculado = (account.current_balance || 0) + netoImportacion;

                await supabase
                    .from('finance_accounts')
                    .update({ current_balance: nuevoSaldoCalculado })
                    .eq('id', account_id);
            }
        }
        // Nota: Si importMode es 'historic', no tocamos el current_balance para proteger tu saldo real de hoy.

        // Actualizamos las líneas del importador padre
        await supabase
            .from('finance_importers')
            .update({ row_count: finalTransactions.length })
            .eq('id', importerRecord.id);

        const { revalidatePath } = await import('next/cache');
        revalidatePath('/finance');

        return {
            success: true,
            transactionsCount: finalTransactions.length,
            autoCategorizedCount
        };

    } catch (e) {
        return { success: false, error: `Error interno: ${e instanceof Error ? e.message : String(e)}` };
    }
}


function mapCsvRow(
    row: { [key: string]: string },
    mapping: ImporterTemplate['mapping'],
    account_id: string,
    user_id: string,
): ParsedTransaction | null {
  
    const { operation_date, concept, amount, sign_column, bank_balance } = mapping;

    const rawDate = row[operation_date]?.trim();
    const rawConcept = row[concept]?.trim();
    const rawAmountStr = row[amount]?.trim() || "";
    const rawSign = sign_column ? row[sign_column]?.trim() : null;
    const rawBalanceStr = bank_balance ? row[bank_balance]?.trim() : null;

    const sanitize = (val: string) => {
        if (!val) return "0";
        let n = val.trim();
        // Si ya viene limpio con puntos decimales americanos (ej: 2000.00) y no hay comas, lo dejamos pasar
        if (n.includes('.') && !n.includes(',')) {
            return n;
        }
        // Si viene con formato tradicional español (ej: 2.000,00 o -60,50)
        return n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    };
  
    const numericAmount = parseFloat(sanitize(rawAmountStr));
    const numericBalance = rawBalanceStr ? parseFloat(sanitize(rawBalanceStr)) : null;

    if (!rawDate || isNaN(numericAmount) || !rawConcept) return null;
  
    let finalAmount: number;

    if (sign_column && rawSign) {
        if (rawSign.toLowerCase().includes('d') || rawSign.includes('-')) {
            finalAmount = -Math.abs(numericAmount); 
        } else {
            finalAmount = Math.abs(numericAmount); 
        }
    } else {
        finalAmount = numericAmount;
    }
  
    let dateForDb = rawDate;
    const dateParts = rawDate.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  
    if (dateParts) {
        const [, day, month, year] = dateParts;
        dateForDb = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return {
        date: dateForDb,
        amount: finalAmount,
        concept: rawConcept,
        bank_balance: numericBalance,
        importer_notes: `Importado de CSV: ${rawDate}`,
    };
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

export async function createImporterTemplate(name: string, settings: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { data, error } = await supabase
        .from('finance_importer_templates')
        .insert({
            name,
            settings,
            user_id: user.id
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/finance');
    return { success: true, data };
}

export async function updateImporterTemplate(id: string, name: string, settings: any) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('finance_importer_templates')
        .update({ name, settings })
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/finance');
    return { success: true };
}

export async function deleteImporterTemplate(id: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('finance_importer_templates')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/finance');
    return { success: true };
}

export async function getAccountFileLimitsAction(accountId: string): Promise<{
    success: boolean;
    newestDate?: string;
    oldestDate?: string;
    error?: string;
}> {
    try {
        const supabase = await createClient();

        // 1. Obtener la transacción MÁS RECIENTE de la app para esta cuenta
        const { data: recentData, error: err1 } = await supabase
            .from('finance_transactions')
            .select('date')
            .eq('account_id', accountId)
            .order('date', { ascending: false })
            .order('import_sequence', { ascending: false })
            .limit(1);

        // 2. Obtener la transacción MÁS ANTIGUA de la app para esta cuenta
        const { data: oldestData, error: err2 } = await supabase
            .from('finance_transactions')
            .select('date')
            .eq('account_id', accountId)
            .order('date', { ascending: true })
            .order('import_sequence', { ascending: true })
            .limit(1);

        if (err1 || err2) {
            return { success: false, error: 'Error al consultar extremos en la BD.' };
        }

        // Función interna para formatear YYYY-MM-DD a DD/MM/YYYY
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
        return { success: false, error: e instanceof Error ? e.message : 'Error interno' };
    }
}