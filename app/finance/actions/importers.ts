'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import {ActionResponse } from '@/types/common'




import { ImporterTemplate, ParsedTransaction } from '@/types/finance'; // Asegúrate de importar ParsedTransaction
import * as csv from 'csv-parser'; // Importar la librería
import { Readable } from 'stream'; // Requerido para manejar el archivo en Node.js

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

        if (!file) return { success: false, error: 'No se ha subido ningún archivo.' };

        const supabase = await createClient();
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData.user) return { success: false, error: 'Usuario no autenticado.' };

        const user_id = userData.user.id;

        // 1. OBTENER CUENTA
        const { data: account, error: accountError } = await supabase
            .from('finance_accounts')
            .select('id, account_type')
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

        // 4. PROCESAMIENTO CSV (Tu lógica robusta de limpieza)
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

        try {
            const parser = csv.default({
                separator: delimiter || ';',
                mapHeaders: ({ header }: { header: string }) => header.trim().replace(/"/g, ''),
            });

            parser.on('data', (row: Record<string, string>) => {
                const mappedRow = mapCsvRow(row, mapping, account_id, user_id);
                if (mappedRow) {
                    if (invertAmountManual) mappedRow.amount *= -1;
                    transactions.push(mappedRow);
                }
            }).on('error', (error: Error) => {
                throw new Error(`Error al parsear: ${error.message}`);
            });

            parser.write(cleanedStreamContent);
            parser.end();
        } catch (e) {
            return { success: false, error: `Error procesando CSV: ${(e as Error).message}` };
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

  // 1. Obtener valores crudos
  const rawDate = row[operation_date]?.trim();
  const rawConcept = row[concept]?.trim();
  const rawAmountStr = row[amount]?.trim() || "";
  const rawSign = sign_column ? row[sign_column]?.trim() : null;
  const rawBalanceStr = bank_balance ? row[bank_balance]?.trim() : null;

  // --- CORRECCIÓN CLAVE PARA FORMATO ESPAÑOL ---
  // Ejemplo: "1.910,45" -> "1910.45"
  const sanitize = (val: string) => val.replace(/\./g, '').replace(',', '.');
  
  const numericAmount = parseFloat(sanitize(rawAmountStr));
  const numericBalance = rawBalanceStr ? parseFloat(sanitize(rawBalanceStr)) : null;
  // --------------------------------------------

  if (!rawDate || isNaN(numericAmount) || !rawConcept) return null;
  
  let finalAmount: number;

  // 2. Manejar el signo
  if (sign_column && rawSign) {
    // Si hay columna de signo (D/C, +/-), forzamos la polaridad
    if (rawSign.toLowerCase().includes('d') || rawSign.includes('-')) {
        finalAmount = -Math.abs(numericAmount); 
    } else {
        finalAmount = Math.abs(numericAmount); 
    }
  } else {
    // Si no hay columna de signo, confiamos en el signo que ya traiga el número parseado
    finalAmount = numericAmount;
  }
  
  // 3. Formatear fecha a ISO (yyyy-mm-dd) para la base de datos
  let dateForDb = rawDate;
  const dateParts = rawDate.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  
  if (dateParts) {
    const [, day, month, year] = dateParts;
    dateForDb = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 4. Devolver la transacción parseada
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
    
    // 1. Obtener la transacción más antigua que ya existe
    const { data: oldestTx } = await supabase
        .from('finance_transactions')
        .select('date')
        .eq('account_id', accountId)
        .order('date', { ascending: true })
        .limit(1)
        .single();

    let initialBalanceAdjustment = 0;
    const finalTransactions = [];

    for (const tx of transactions) {
        // Si la transacción que importo es ANTERIOR a la más antigua que ya tengo
        if (oldestTx && new Date(tx.date) < new Date(oldestTx.date)) {
            // Es histórico: acumulamos para ajustar el saldo inicial
            initialBalanceAdjustment += tx.amount;
        }
        finalTransactions.push({ ...tx, account_id: accountId, user_id: userId });
    }

    // 2. Si hay ajustes históricos, actualizamos el saldo inicial de la cuenta
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

    // 3. Insertar movimientos
    return await supabase.from('finance_transactions').insert(finalTransactions);
}

// app/finance/actions.ts

export async function validateAndImportAction(
    transactions: any[], 
    accountId: string, 
    userId: string,
    mode: 'new' | 'historic'
) {
    const supabase = await createClient();

    // 1. Si es modo HISTÓRICO, calculamos el sumatorio para el saldo inicial
    if (mode === 'historic') {
        const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0);
        
        const { data: account } = await supabase
            .from('finance_accounts')
            .select('initial_balance')
            .eq('id', accountId)
            .single();

        if (account) {
            // Ajustamos el saldo inicial para que la línea de tiempo sea coherente
            await supabase
                .from('finance_accounts')
                .update({ initial_balance: account.initial_balance + totalAmount })
                .eq('id', accountId);
        }
    }

    // 2. Insertamos los movimientos (bank_balance incluido)
    const { error } = await supabase
        .from('finance_transactions')
        .insert(transactions.map(t => ({ ...t, account_id: accountId, user_id: userId })));

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