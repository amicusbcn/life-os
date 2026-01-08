// app/finance/actions.ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { FinanceAccountType, FinanceCategory, FinanceTransactionSplit } from '@/types/finance'; 

// Interfaz para resultados
export interface ActionResult {
  success?: boolean;
  error?: string;
  data?: Record<string, unknown>; // Opcionalmente, { id?: string; count?: number; ... }
}
// 2. Definimos ImportResult y CreateAccountResult (para mantener el tipado exacto)
export interface CreateAccountResult extends ActionResult {
    data?: { id: string }; // Sobrescribe data con el tipo específico
}
export interface ImportResult extends ActionResult {
    data?: { count: number }; // Sobrescribe data con el tipo específico
}
// ==========================================
// 1. CREATE ACCOUNT (Refactorizada con revalidatePath y error handling)
// ==========================================
/**
 * Crea una nueva cuenta financiera (bancaria, tarjeta, inversión, etc.) para el usuario autenticado.
 * @param formData FormData del formulario de cuenta.
 * @returns Un objeto con el resultado de la operación.
 */
export async function createAccount(
  _prevState: CreateAccountResult,
  formData: FormData
): Promise<CreateAccountResult> {
  const supabase = await createClient();
  const { revalidatePath } = await import('next/cache');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Usuario no autenticado.' };

  // Logs para depuración
  console.log("--- Iniciando createAccount ---");
  console.log("User ID:", user.id);

  const name = formData.get('name') as string;
  const accountType = formData.get('account_type') as FinanceAccountType;
  const initialBalanceStr = formData.get('initial_balance') as string;
  const colorTheme = formData.get('color_theme') as string;
  const accountNumber = formData.get('account_number') as string;
  const currency = (formData.get('currency') as string) || 'EUR';

  console.log("Datos recibidos:", { name, accountType, initialBalanceStr, accountNumber });

  if (!name || !accountType) {
    return { success: false, error: 'Nombre y Tipo son obligatorios.' };
  }
  
  const initialBalance = initialBalanceStr ? parseFloat(initialBalanceStr.replace(',', '.')) : 0;
  if (isNaN(initialBalance)) return { success: false, error: 'Saldo inicial no válido.' };

  try {
    const payload = {
        user_id: user.id,
        name: name.trim(),
        account_type: accountType,
        currency: currency.toUpperCase(),
        initial_balance: initialBalance,
        current_balance: initialBalance, // ✨ Importante: inicializamos el saldo actual igual al inicial
        color_theme: colorTheme || '#6366f1',
        account_number: accountNumber?.trim() || null,
        avatar_letter: name.trim().charAt(0).toUpperCase(),
        is_active: true,
      };

    console.log("Insertando payload:", payload);

    const { data, error } = await supabase
      .from('finance_accounts')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
        console.error('Error de Supabase:', error);
        throw error;
    }
    
    console.log("Cuenta creada con éxito ID:", data.id);
    revalidatePath('/finance');
    return { success: true, data: { id: data.id } };
  } catch (e: any) {
    console.error('Captura de error crítico:', e);
    // Devolvemos un error más descriptivo si existe
    return { success: false, error: e.message || 'Error desconocido al crear la cuenta' };
  }
}

export async function updateAccount(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { revalidatePath } = await import('next/cache');

  // 1. Extraer datos
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const importerId = formData.get('importer_id') as string;

  // 2. Parseo de saldo (Solo si viene en el FormData, si no, no lo tocamos)
  const initialBalanceRaw = formData.get('initial_balance');
  const initialBalance = initialBalanceRaw 
    ? parseFloat(initialBalanceRaw.toString().replace(',', '.')) 
    : undefined;

  const accountType = formData.get('account_type') as any;
  const colorTheme = formData.get('color_theme') as string;
  const accountNumber = formData.get('account_number') as string;
  const avatarLetter = formData.get('avatar_letter') as string;
  
  // 3. Booleanos (Conversión segura de string a boolean)
  const isActive = formData.get('is_active') === 'true';
  const autoMirrorTransfers = formData.get('auto_mirror_transfers') === 'true'; // <--- NUEVO

  try {
    // 4. Construcción dinámica del objeto de actualización
    const updateData: any = {
      name: name.trim(),
      account_type: accountType,
      color_theme: colorTheme,
      account_number: accountNumber?.trim(),
      avatar_letter: avatarLetter?.trim().charAt(0).toUpperCase(),
      is_active: isActive,
      auto_mirror_transfers: autoMirrorTransfers,
      importer_id: importerId === "" ? null : importerId, // 🚩 AÑADIR ESTO    
    };

    // Solo actualizamos el balance si realmente se ha pasado un valor numérico
    if (initialBalance !== undefined && !isNaN(initialBalance)) {
      updateData.initial_balance = initialBalance;
    }

    const { error } = await supabase
      .from('finance_accounts')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/finance');
    return { success: true };
  } catch (e: any) {
    console.error('Error updating account:', e);
    return { success: false, error: e.message };
  }
}

// DELETE ACCOUNT (Se mantiene igual, es correcta)
export async function deleteAccount(accountId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { revalidatePath } = await import('next/cache');
    try {
        const { error } = await supabase
            .from('finance_accounts')
            .delete()
            .eq('id', accountId);

        if (error) {
            if (error.code === '23503') {
                return { success: false, error: 'No se puede eliminar: tiene transacciones asociadas.' };
            }
            throw error;
        }

        revalidatePath('/finance');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
// ==========================================
// 3. CREATE CATEGORY (Nueva)
// ==========================================

export interface CreateCategoryResult extends ActionResult {
    data?: { id: string, category: FinanceCategory }; // Devolver el objeto categoría
}

export async function createCategory(
    _prevState: ActionResult, 
    formData: FormData
): Promise<CreateCategoryResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { revalidatePath } = await import('next/cache');
    
    if (!user) return { success: false, error: 'Acceso denegado.' };

    const name = formData.get('name') as string;
    const isIncomeStr = formData.get('is_income') as string;
    const parentId = formData.get('parent_id') as string | null;
    const iconName = formData.get('icon_name') as string; // Capturamos icon_name

    if (!name) return { success: false, error: 'El nombre es obligatorio.' };

    try {
        const { data, error } = await supabase
            .from('finance_categories')
            .insert({
                user_id: user.id,
                name: name.trim(),
                is_income: isIncomeStr === 'true',
                parent_id: parentId && parentId !== 'no-parent' ? parentId : null,
                icon_name: iconName || 'Tag',
                // Si es raíz, le asignamos un color neutro inicial
                color: (!parentId || parentId === 'no-parent') ? '#64748b' : null,
            })
            .select('*')
            .single();

        if (error) throw error;

        revalidatePath('/finance');
        return { success: true, data: { id: data.id, category: data as FinanceCategory } };
    } catch (e: any) {
        return { success: false, error: e.message || 'Error inesperado' };
    }
}

// ==========================================
// 4. UPDATE CATEGORY (Nueva)
// ==========================================
export async function updateCategory(
  _prevState: ActionResult, 
  formData: FormData
): Promise<ActionResult> {
    const supabase = await createClient();
    const { revalidatePath } = await import('next/cache');

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const iconName = formData.get('icon_name') as string;
    const color = formData.get('color') as string;

    if (!id || !name) return { success: false, error: 'Faltan datos obligatorios.' };

    try {
        const { error } = await supabase
            .from('finance_categories')
            .update({
                name: name.trim(),
                icon_name: iconName,
                color: color || null,
            })
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/finance');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Error inesperado' };
    }
}


// ==========================================
// 5. DELETE CATEGORY (Nueva)
// ==========================================
export async function deleteCategory(categoryId: string): Promise<ActionResult> {
    const supabase = await createClient();

    const { revalidatePath } = await import('next/cache');

    if (!categoryId) {
        return { success: false, error: 'ID de categoría es obligatorio.' };
    }

    try {
        const { error } = await supabase
            .from('finance_categories')
            .delete()
            .eq('id', categoryId);

        if (error) {
            console.error('Supabase error deleting category:', error);
            if (error.code === '23503') { // Foreign Key Constraint
                return { success: false, error: 'No se puede eliminar la categoría porque tiene subcategorías o transacciones asociadas.' };
            }
            return { success: false, error: `Error de base de datos: ${error.message}` };
        }

        revalidatePath('/finance');
        return { success: true };
    } catch (e) {
        console.error('Unexpected error in deleteCategory:', e);
        return { success: false, error: 'Ocurrió un error inesperado.' };
    }
}

// app/finance/actions.ts (Fragmento)
// ... (imports y ActionResult)

// Importamos el tipo de Transacción para el batch insert
import { FinanceTransaction } from '@/types/finance'; 

// ==========================================
// UTILITY: C43 PARSER (Implementación simple)
// ==========================================



/**
 * Parser simple para el formato Cuaderno 43 (Norma 43).
 * Solo extrae Registros 22 (Movimiento) y 23 (Concepto).
 * @param content Contenido del archivo C43 como string.
 * @returns Array de transacciones parseadas.
 */
// app/finance/actions.ts (Sustituir la función parseC43 nuevamente)

/**
 * Parser C43 basado en el tipo de registro (22 y 23), más robusto ante saltos de línea extraños.
 */
function parseC43(content: string): ParsedTransaction[] {
    
    // Separamos por saltos de línea.
    const lines = content.split(/\r?\n|\r/g).filter(line => line.length > 100); 

    const transactions: ParsedTransaction[] = [];
    let currentTransaction: Partial<ParsedTransaction> = {};

    for (const line of lines) {
        // Aseguramos que solo trabajamos con las primeras 160 posiciones, ignorando padding o basura.
        const record = line.substring(0, 160); 
        const recordType = record.substring(0, 2); 

        if (recordType === '22') {
            // --- REGISTRO 22: Movimiento ---
            
            // Si hay una transacción incompleta anterior, la guardamos.
            if (currentTransaction.date && currentTransaction.amount) {
                transactions.push(currentTransaction as ParsedTransaction);
            }
            
            // Reiniciar y empezar una nueva transacción
            currentTransaction = {}; 

            // 1. Fecha de Operación (Pos 11-16 -> Índices 10-15)
            const dateStr = record.substring(10, 16); 
            const yearPrefix = new Date().getFullYear().toString().substring(0, 2); 
            const date = `${yearPrefix}${dateStr.substring(0, 2)}-${dateStr.substring(2, 4)}-${dateStr.substring(4, 6)}`;
            
            // 2. Signo (Pos 82 -> Índice 81) y Importe (Pos 83-96 -> Índices 82-95)
            const signChar = record.substring(81, 82); 
            // Signo: 1 = Cargo (Gasto) -> Negativo, 2 = Abono (Ingreso) -> Positivo
            const sign = signChar === '1' ? -1 : 1; 
            
            const amountStr = record.substring(82, 96); 
            const amount = sign * (parseInt(amountStr.trim(), 10) / 100); 

            // 3. Concepto Común/Propio (Pos 98-101)
            const conceptCode = record.substring(97, 101);

            currentTransaction = {
                date: date,
                amount: amount,
                concept: `CÓDIGO ${conceptCode}`, 
                importer_notes: `Fecha Valor: ${record.substring(16, 22)}`,
            };

        } else if (recordType === '23' && currentTransaction.date) {
            // --- REGISTRO 23: Concepto Detallado ---
            const description1 = record.substring(4, 44).trim();
            const description2 = record.substring(44, 84).trim();
            
            currentTransaction.concept = description1 + (description2 ? ` ${description2}` : '');
        }
    }
    
    // Asegurarse de empujar la última transacción si existe y es válida
    if (currentTransaction.date && currentTransaction.amount) {
        transactions.push(currentTransaction as ParsedTransaction);
    }
    
    return transactions;
}


// ==========================================
// 6. IMPORT C43 ACTION (Nueva)
// ==========================================

export async function importC43Action(
  _prevState: ImportResult, 
  formData: FormData
): Promise<ImportResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { revalidatePath } = await import('next/cache');

    if (!user) {
        return { success: false, error: 'Acceso denegado.' };
    }

    const file = formData.get('c43_file') as File;
    const accountId = formData.get('account_id') as string;
    const importerName = formData.get('importer_name') as string;

    if (!file || !accountId || !importerName) {
        return { success: false, error: 'Faltan campos obligatorios: Archivo C43, Cuenta y Nombre de Importación.' };
    }

    if (file.size > 5 * 1024 * 1024) { // Límite de 5MB
        return { success: false, error: 'El archivo es demasiado grande. Límite: 5MB.' };
    }
    
    if (file.type && file.type !== 'text/plain') {
         // C43 es un archivo de texto, aunque sin extensión específica
    }
    
    // --- 1. Leer y Parsear el Archivo ---
    let fileContent: string;
try {
    // Usamos arrayBuffer() y TextDecoder para leer el contenido de texto en el Server Action
    const buffer = await file.arrayBuffer();
    // Probaremos con UTF-8 como fallback, aunque latin1 es más común
    fileContent = new TextDecoder('latin1').decode(buffer); // <-- Mantener latin1
} catch (e) {
    return { success: false, error: `Error al leer el archivo: ${(e as Error).message}` };
}

// === LÍNEAS DE DEBUG (AÑADIR ESTAS DOS LÍNEAS) ===
console.log("--- DEBUG C43 START ---");
console.log(fileContent.length, fileContent.substring(0, 400)); // Muestra la longitud total y los primeros 400 caracteres
console.log("--- DEBUG C43 END ---");
// ===============================================

let parsedTransactions: ParsedTransaction[];
    try {
        parsedTransactions = parseC43(fileContent);
    } catch (e) {
        console.error('C43 Parsing Error:', e);
        return { success: false, error: 'Error al procesar el formato N43. ¿Es el archivo correcto?' };
    }
    
    if (parsedTransactions.length === 0) {
        return { success: false, error: 'No se encontraron movimientos válidos en el archivo.' };
    }

    // --- 2. Inserción en BBDD (Transaccional) ---
    
    try {
        // A. Crear registro de Importación
        const { data: importerData, error: importerError } = await supabase
            .from('finance_importers')
            .insert({
                user_id: user.id,
                name: importerName.trim(),
                file_type: 'C43',
            })
            .select('id')
            .single();

        if (importerError) throw importerError;

        const importerId = importerData.id;

        // B. Preparar las transacciones para la inserción
        const transactionsToInsert: Partial<FinanceTransaction>[] = parsedTransactions.map(pt => ({
            user_id: user.id,
            date: pt.date,
            concept: pt.concept,
            amount: pt.amount,
            account_id: accountId,
            importer_id: importerId,
            // Inicialmente no categorizada, ni split
            is_split: false,
            category_id: null, 
            travel_expense_id: null,
        }));

        // C. Insertar Transacciones en BATCH
        const { error: transactionsError } = await supabase
            .from('finance_transactions')
            .insert(transactionsToInsert);

        if (transactionsError) throw transactionsError;

        revalidatePath('/finance');
        return { success: true, data: { count: parsedTransactions.length } };

    } catch (e) {
        console.error('Error durante la inserción en BBDD:', e);
        // Podríamos intentar borrar el registro de Importer si falla la transacción...
        return { success: false, error: `Error al guardar movimientos en la base de datos: ${(e as Error).message}` };
    }
}

// app/finance/actions.ts (Nueva Server Action)

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

export async function updateTransactionCategoryAction(transactionId: string, categoryId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('finance_transactions')
        .update({ category_id: categoryId === 'pending' ? null : categoryId })
        .eq('id', transactionId);

    if (error) {
        console.error('Error updating category:', error);
        return { success: false, error: error.message };
    }

    // ✅ IMPORTANTE: Descomentar para que Next.js refresque el cache
    revalidatePath('/finance'); 
    return { success: true };
}

// app/finance/actions.ts

export async function createRule(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const pattern = (formData.get('pattern') as string).toUpperCase();
    const category_id = formData.get('category_id') as string;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No user' };

    const { data,error } = await supabase
        .from('finance_rules')
        .insert({ pattern, category_id, user_id: user.id })
        .select() // ✨ Importante: para que devuelva el objeto creado
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function deleteRule(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('finance_rules').delete().eq('id', id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function applyRuleRetroactively(ruleId: string) {
    const supabase = await createClient();
    const { revalidatePath } = await import('next/cache');

    // 1. Obtener los detalles de la regla
    const { data: rule, error: ruleError } = await supabase
        .from('finance_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

    if (ruleError || !rule) return { success: false, error: 'Regla no encontrada' };

    // 2. Actualizar transacciones que coincidan con el patrón y NO tengan categoría
    // Usamos ilike para que no importe mayúsculas/minúsculas
    const { error: updateError, count } = await supabase
        .from('finance_transactions')
        .update({ category_id: rule.category_id }, { count: 'exact' }) // 👈 Añadimos count exact
        .ilike('concept', `%${rule.pattern}%`)
        .is('category_id', null)
        .select(); // 👈 Importante para que devuelva los datos procesados

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    revalidatePath('/finance');
    return { success: true, count: count || 0 };
}

/**
 * Registra o ACTUALIZA el desglose de una transacción existente.
 * 1. Borra cualquier split previo de esta transacción.
 * 2. Inserta los nuevos registros en finance_transaction_splits.
 * 3. Asegura que la transacción principal tenga is_split = true y category_id = null.
 */
export async function splitTransactionAction(
  transactionId: string,
  // 🪄 Actualizamos el tipo para aceptar la cuenta destino opcional
  splits: (Omit<FinanceTransactionSplit, 'id' | 'user_id' | 'transaction_id'> & { target_account_id?: string })[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";

  try {
    // 🛡️ Validación de seguridad
    if (splits.some(s => !s.category_id || s.category_id.trim() === "")) {
      throw new Error("Una o más categorías no son válidas.");
    }

    // --- PASO 1: LIMPIEZA ---
    const { error: deleteError } = await supabase
      .from('finance_transaction_splits')
      .delete()
      .eq('transaction_id', transactionId);

    if (deleteError) throw new Error(`Error limpiando desgloses: ${deleteError.message}`);

    // --- PASO 2: INSERCIÓN DE SPLITS ---
    // Quitamos el target_account_id antes de insertar en la tabla de splits 
    // porque esa tabla no tiene esa columna (solo nos sirve para la lógica de la acción)
    const splitsToInsert = splits.map(({ target_account_id, ...split }) => ({
      ...split,
      transaction_id: transactionId,
      user_id: user.id,
      amount: Number(split.amount)
    }));

    const { error: insertError } = await supabase
      .from('finance_transaction_splits')
      .insert(splitsToInsert);

    if (insertError) throw new Error(`Error insertando desgloses: ${insertError.message}`);

    // --- PASO 3: ACTUALIZACIÓN TRANSACCIÓN PADRE ---

    await supabase
      .from('finance_transactions')
      .update({ is_split: true, category_id: null })
      .eq('id', transactionId);

    // --- PASO 4: LÓGICA DE TRANSFERENCIA (LA MAGIA) ---
    // Buscamos si alguna línea del desglose es una transferencia con destino
    const transferSplit = splits.find(s => s.category_id === TRANSFER_CAT_ID && s.target_account_id);

    if (transferSplit) {
      // 1. Obtenemos la transacción original para copiar fecha y concepto
      const { data: original } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (original) {
        // 2. Creamos el movimiento espejo en la cuenta destino (ej. Hipoteca)
        // Usamos solo el importe de esa línea del desglose
        const { data: mirror } = await supabase
          .from('finance_transactions')
          .insert({
            account_id: transferSplit.target_account_id,
            amount: Math.abs(Number(transferSplit.amount)), // Positivo (amortización)
            concept: `AMORT: ${original.concept}`,
            date: original.date,
            category_id: TRANSFER_CAT_ID,
            user_id: user.id,
            transfer_id: transactionId // Vinculamos al padre
          })
          .select().single();

        // 3. Vinculamos el padre al hijo (opcional, para trazabilidad doble)
        if (mirror) {
            await supabase
              .from('finance_transactions')
              .update({ transfer_id: mirror.id })
              .eq('id', transactionId);
        }
      }
    }

    revalidatePath('/finance');
    return { success: true };

  } catch (error: any) {
    console.error('Action Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Elimina todos los desgloses de una transacción y la devuelve a su estado original.
 */
export async function removeSplitsAction(transactionId: string) {
  const supabase = await createClient();
  
  try {
    // 1. Borramos todos los splits asociados
    const { error: deleteError } = await supabase
      .from('finance_transaction_splits')
      .delete()
      .eq('transaction_id', transactionId);

    if (deleteError) throw deleteError;

    // 2. Restauramos la transacción original: is_split a false
    const { error: updateError } = await supabase
      .from('finance_transactions')
      .update({ 
        is_split: false,
        category_id: null // Opcional: podrías intentar restaurar una categoría por defecto
      })
      .eq('id', transactionId);

    if (updateError) throw updateError;

    revalidatePath('/finance');
    return { success: true };
  } catch (error: any) {
    console.error('Error removing splits:', error.message);
    return { success: false, error: error.message };
  }
}

// app/finance/actions.ts

export async function handleTransferAction(sourceTxId: string, targetAccountId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";

    // 1. Obtener transacción origen y LA CONFIGURACIÓN de la cuenta destino
    const [{ data: source }, { data: targetAccount }] = await Promise.all([
        supabase.from('finance_transactions').select('*').eq('id', sourceTxId).single(),
        // Ahora pedimos explícitamente nuestra nueva columna
        supabase.from('finance_accounts').select('account_type, auto_mirror_transfers').eq('id', targetAccountId).single()
    ]);

    if (!source || !targetAccount) return { success: false, error: "Datos no encontrados" };

    // 2. Lógica de decisión basada en la configuración de la cuenta
    // Si el switch está ON, creamos espejo. Si está OFF, solo categorizamos.
    const shouldCreateMirror = targetAccount.auto_mirror_transfers === true;

    if (shouldCreateMirror) {
        // --- CASO A: GENERAR MOVIMIENTO ESPEJO ---
        const { data: mirror, error: mirrorError } = await supabase
            .from('finance_transactions')
            .insert({
                account_id: targetAccountId,
                amount: -source.amount, 
                concept: `VÍNCULO: ${source.concept}`,
                date: source.date,
                category_id: TRANSFER_CAT_ID,
                user_id: user.id,
                transfer_id: source.id 
            })
            .select().single();

        if (mirrorError) return { success: false, error: mirrorError.message };

        await supabase.from('finance_transactions')
            .update({ 
                transfer_id: mirror.id, 
                category_id: TRANSFER_CAT_ID 
            })
            .eq('id', source.id);
            
        revalidatePath('/finance');
        return { success: true, message: "Movimiento espejo creado automáticamente según configuración" };
    } else {
        // --- CASO B: SOLO CATEGORIZAR (Esperar a importación) ---
        await supabase.from('finance_transactions')
            .update({ category_id: TRANSFER_CAT_ID })
            .eq('id', source.id);

        revalidatePath('/finance');
        return { success: true, message: "Categorizado como transferencia. No se ha creado espejo por configuración de la cuenta." };
    }
}

export async function updateTransactionNoteAction(transactionId: string, notes: string) {
    const supabase = await createClient(); // Asegúrate de que esto usa el cliente de servidor
    
    const { data, error } = await supabase
        .from('finance_transactions')
        .update({ notes: notes }) // Verifica que la columna en la BBDD se llame exactamente 'notes'
        .eq('id', transactionId);

    if (error) {
        console.error("Error en Supabase:", error.message);
        return { success: false, error: error.message };
    }
    
    revalidatePath('/finance'); // Esto es vital para que la UI se entere del cambio
    return { success: true };
}

export async function findMirrorCandidatesAction(amount: number, date: string, currentId: string) {
    const supabase = await createClient();
    // El espejo es el signo contrario (-100 -> 100)
    const searchAmount = Number(amount) * -1;
    
    // Rango de 5 días
    const d = new Date(date);
    const minDate = new Date(d.getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    const maxDate = new Date(d.getTime() + (5 * 24 * 60 * 60 * 1000)).toISOString();

    const { data, error } = await supabase
        .from('finance_transactions')
        .select(`
            id, 
            concept, 
            amount, 
            date, 
            account_id,
            finance_accounts (name)
        `)
        .eq('amount', searchAmount)
        .gte('date', minDate)
        .lte('date', maxDate)
        .is('transfer_id', null) // Solo los que no estén ya vinculados
        .neq('id', currentId);

    return { success: !error, candidates: data || [] };
}

export async function reconcileTransactionsAction(id1: string, id2: string) {
    const supabase = await createClient();
    
    // Vinculación bidireccional usando transfer_id
    const { error: err1 } = await supabase
        .from('finance_transactions')
        .update({ transfer_id: id2, category_id: '10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a' })
        .eq('id', id1);

    const { error: err2 } = await supabase
        .from('finance_transactions')
        .update({ transfer_id: id1, category_id: '10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a' })
        .eq('id', id2);

    if (err1 || err2) return { success: false, error: "Error al conciliar" };
    
    revalidatePath('/finance');
    return { success: true };
}

// app/finance/actions.ts

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
export async function createInventoryItemFromTxAction(
    txId: string, 
    data: { name: string; date: string; price: number }
) {
    const supabase = await createClient();

    // 1. Creamos el ítem en el inventario
    const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .insert({
            name: data.name,
            purchase_date: data.date,
            purchase_price: data.price,
            transaction_id: txId,
            status: 'active',
            // Calculamos garantía: fecha compra + 3 años
            warranty_expiry: new Date(new Date(data.date).setFullYear(new Date(data.date).getFullYear() + 3)).toISOString()
        })
        .select()
        .single();

    if (itemError) return { success: false, error: itemError.message };

    // 2. Opcional: Podríamos marcar la transacción con un tag o nota 
    // indicando que ya está en el inventario para que no se duplique.
    
    return { success: true, item };
}

export async function linkTransactionToInventoryAction(
    txId: string, 
    itemId: string, 
    isInitialPurchase: boolean
) {
    const supabase = await createClient();

    // 1. Vinculamos la transacción al ítem
    const { error: txError } = await supabase
        .from('finance_transactions')
        .update({ inventory_item_id: itemId })
        .eq('id', txId);

    if (txError) return { success: false, error: txError.message };

    // 2. Si es compra inicial, actualizamos los datos del objeto
    if (isInitialPurchase) {
        // Obtenemos los datos de la transacción para aplicarlos al ítem
        const { data: tx } = await supabase
            .from('finance_transactions')
            .select('amount, date')
            .eq('id', txId)
            .single();

        if (tx) {
            const purchaseDate = new Date(tx.date);
            // Calculamos garantía (fecha + 3 años)
            const warrantyDate = new Date(purchaseDate);
            warrantyDate.setFullYear(warrantyDate.getFullYear() + 3);

            const { error: invError } = await supabase
                .from('inventory_items')
                .update({
                    purchase_price: Math.abs(tx.amount),
                    purchase_date: tx.date,
                    warranty_expiry: warrantyDate.toISOString()
                })
                .eq('id', itemId);

            if (invError) return { success: false, error: invError.message };
        }
    }

    return { success: true };
}

export async function getInventoryItemsAction() {
    const supabase = await createClient();
    
    // Consultamos id, name y el nombre de la categoría (asumiendo que la tabla se llama inventory_categories)
    const { data, error } = await supabase
        .from('inventory_items')
        .select(`
            id, 
            name, 
            category_id,
            inventory_categories (name)
        `)
        .order('name', { ascending: true });

    if (error) {
        console.error("❌ Error en getInventoryItemsAction:", error);
        return { success: false, error: error.message };
    }
    
    return { success: true, data };
}

// --- ACCIONES DE VIAJES Y CONCILIACIÓN ---

// 1. Obtener viajes activos (de la tabla travel_trips)
export async function getActiveTripsAction() {
    const supabase = await createClient();
    // Quitamos filtros temporales para asegurar que ves algo
    const { data, error } = await supabase
        .from('travel_trips')
        .select('id, name, start_date, end_date')
        .order('start_date', { ascending: false });

    if (error) {
        console.error("Error Supabase:", error);
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

// NUEVA: Crear un viaje real desde el diálogo financiero
export async function createFullTripAction(name: string, startDate: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Buscamos un empleador por defecto para que no falle el NOT NULL
    const { data: employer } = await supabase.from('travel_employers').select('id').limit(1).single();
    
    if (!employer) return { success: false, error: "Crea primero un Empleador en la sección de Viajes" };

    const { data, error } = await supabase
        .from('travel_trips')
        .insert({
            name,
            start_date: startDate,
            end_date: startDate, // Por defecto el mismo día
            employer_id: employer.id,
            user_id: user?.id,
            status: 'planned'
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}
// 2. Obtener gastos de un viaje (de la tabla travel_expenses)
// app/finance/actions.ts

export async function getTripExpensesAction(tripId: string) {
    const supabase = await createClient();
    
    // Traemos los gastos del viaje
    // Nota: Asegúrate de que el campo es 'trip_id' o 'travel_trip_id' según tu esquema
    const { data, error } = await supabase
        .from('travel_expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false });

    if (error) {
        console.error("Error cargando gastos:", error);
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

// app/finance/actions.ts

export async function findSuggestedExpenseAction(amount: number, date: string) {
    const supabase = await createClient();
    const absAmount = Math.abs(amount);

    const { data, error } = await supabase
        .from('travel_expenses')
        .select(`
            *,
            travel_trips (id, name)
        `)
        .eq('amount', absAmount)
        .order('date', { ascending: false })
        .limit(5); // Traemos los 5 más probables

    if (error) return { success: false, error: error.message };
    
    // Si queremos ser estrictos con la fecha, filtramos en JS o lo añadimos a la query
    return { success: true, data };
}

// 3. Vincular transacción bancaria con un gasto de viaje específico
export async function linkTransactionToExpenseAction(txId: string, expenseId: string, tripId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('finance_transactions')
        .update({ 
            travel_expense_id: expenseId,
            trip_id: tripId // 🚀 Guardamos el acceso directo al viaje
        })
        .eq('id', txId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 4. Crear un gasto en el viaje directamente desde el banco (si no existe el ticket)
export async function createExpenseFromBankAction(tripId: string, transaction: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Creamos el gasto en la tabla de viajes
    const { data: expense, error: expError } = await supabase
        .from('travel_expenses')
        .insert({
            trip_id: tripId,
            user_id: user?.id,
            description: transaction.notes || transaction.concept,
            amount: Math.abs(transaction.amount),
            date: transaction.date,
            payment_method: 'card',
            category: 'otros'
        })
        .select()
        .single();

    if (expError) return { success: false, error: expError.message };

    // 🚀 Vinculamos la transacción bancaria con el GASTO y el VIAJE
    return await linkTransactionToExpenseAction(transaction.id, expense.id, tripId);
}

// Vincular la transacción bancaria con el gasto de viaje
export async function linkTxToExpenseAction(txId: string, expenseId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('finance_transactions')
        .update({ travel_expense_id: expenseId })
        .eq('id', txId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// app/finance/actions.ts

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