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
  _prevState: CreateAccountResult, // DEBE ACEPTAR EL ESTADO ANTERIOR
  formData: FormData
): Promise<CreateAccountResult> {
  const supabase = await createClient(); // Usando TU createClient()
  const { revalidatePath } = await import('next/cache');
  // 1. Obtener datos del usuario
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Acceso denegado. Usuario no autenticado.' };
  }

  // 2. Extraer datos del FormData (usando las claves de los inputs del formulario)
  const name = formData.get('name') as string;
  const accountType = formData.get('account_type') as FinanceAccountType;
  const currency = formData.get('currency') as string;
  const initialBalanceStr = formData.get('initial_balance') as string;

  // 3. Validaciones y Conversión
  if (!name || !accountType || !currency || !initialBalanceStr) {
    return { success: false, error: 'Faltan campos obligatorios: Nombre, Tipo, Moneda y Saldo Inicial.' };
  }
  
  let initialBalance: number;
  try {
    initialBalance = parseFloat(initialBalanceStr.replace(',', '.')); 
    if (isNaN(initialBalance)) throw new Error('Saldo inicial no es un número válido.');
  } catch (e) {
    return { success: false, error: 'El Saldo Inicial debe ser un valor numérico.' };
  }

  // 5. Inserción en Supabase
  try {
    const { data, error } = await supabase
      .from('finance_accounts')
      .insert({
        user_id: user.id,
        name: name.trim(),
        account_type: accountType,
        currency: currency.trim().toUpperCase(),
        initial_balance: initialBalance,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase error creating account:', error);
      return { success: false, error: `Error de base de datos: ${error.message}` };
    }
    
    revalidatePath('/finance'); // Refrescamos la ruta para ver los cambios
    return { success: true, data: { id: data.id } };

  } catch (e) {
    console.error('Unexpected error in createAccount:', e);
    return { success: false, error: 'Ocurrió un error inesperado al procesar la solicitud.' };
  }
}


// ==========================================
// 2. DELETE ACCOUNT (Añadida)
// ==========================================
export async function deleteAccount(accountId: string): Promise<CreateAccountResult> {
    const supabase = await createClient(); // Usando TU createClient()
    
    const { revalidatePath } = await import('next/cache');
    try {
        const { error } = await supabase
            .from('finance_accounts')
            .delete()
            .eq('id', accountId);

        if (error) {
            console.error('Supabase error deleting account:', error);
            if (error.code === '23503') { // Foreign Key Constraint
                return { success: false, error: 'No se puede eliminar la cuenta porque tiene transacciones asociadas. Vacíala primero.' };
            }
            return { success: false, error: `Error de base de datos: ${error.message}` };
        }

        revalidatePath('/finance');
        return { success: true };
    } catch (e) {
        console.error('Unexpected error in deleteAccount:', e);
        return { success: false, error: 'Ocurrió un error inesperado.' };
    }
}

export async function updateAccount(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();
    const { revalidatePath } = await import('next/cache');

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const initialBalance = parseFloat(formData.get('initial_balance') as string);
    const accountType = formData.get('account_type') as any;

    try {
        const { error } = await supabase
            .from('finance_accounts')
            .update({
                name: name.trim(),
                initial_balance: initialBalance,
                account_type: accountType
            })
            .eq('id', id);

        if (error) throw error;

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
  
  // Capturar errores generales de Server Action
  try {
    const file = formData.get('file') as File | null;
    const account_id = formData.get('accountId') as string; // <-- Recibimos el ID
    if (!file) {
      return { success: false, error: 'No se ha subido ningún archivo.' };
    }
    
    // 1. AUTENTICACIÓN Y CUENTA
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user) {
      return { success: false, error: 'Usuario no autenticado.' };
    }
    const user_id = userData.user.id;
    
    const { data: accounts, error: accountError } = await supabase
      .from('finance_accounts')
      .select('id, account_type') // 👈 Añadimos account_type aquí
      .eq('id', account_id)       // Usamos el id que viene por formData
      .eq('user_id', user_id)
      .single();                  // Usamos single para obtener el objeto directamente

    if (accountError || !accounts) {
      return { success: false, error: 'No se encontró la cuenta de destino.' };
    }

    const isCreditCard = accounts.account_type === 'credit_card';

    // 2. PROCESAMIENTO DEL CSV
    const { delimiter, mapping } = template as ImporterTemplate;

    // --- Lectura, Limpieza y Parsing Síncrono ---
    
    // a) Leer archivo
    const buffer = await file.arrayBuffer();
    const fileContent = Buffer.from(buffer).toString('utf8');
    
    // b) Limpieza robusta de líneas (para eliminar basura bancaria)
    const allLines = fileContent.split(/\r?\n|\r/g);
    const cleanedLines = allLines.filter(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) return false;
        
        // Comprobar contenido y encabezados inútiles
        const fields = trimmedLine.split(delimiter);
        const hasContent = fields.some(field => field.trim().length > 0);
        const isUselessHeader = trimmedLine.toLowerCase().includes('movimientos de cuenta') 
                                || trimmedLine.startsWith('----')
                                || trimmedLine.includes('saldo inicial');
        
        return hasContent && !isUselessHeader;
    });

    // c) Convertir a un string limpio para el parser síncrono
    const cleanedStreamContent = cleanedLines.join('\n'); 

    const transactions: ParsedTransaction[] = [];
    
    // d) Ejecutar el parsing SÍNCRONO (usando .write())
try {
        const parser = csv.default({ // <-- Usamos csv.default() o solo csv() si funciona
            separator: delimiter || ';', 
            mapHeaders: ({ header }: { header: string }) => header.trim().replace(/"/g, ''), // <-- Tipado: { header: string }
        });

        parser
            .on('data', (row: Record<string, string>) => { // <-- Tipado: row: Record<string, string>
                // Mapear cada fila
                const mappedRow = mapCsvRow(row, mapping, account_id, user_id);
                if (mappedRow) {
                    transactions.push(mappedRow);
                }
            })
            .on('error', (error: Error) => { // <-- Tipado: error: Error
                // Capturar error del parser
                throw new Error(`Error al parsear el CSV: ${error.message}`);
            });

        // La clave del parseo síncrono: Escribir el contenido completo y terminar.
        parser.write(cleanedStreamContent);
        parser.end(); // Indica que no hay más datos

    } catch (e) {
        return { success: false, error: `Error al procesar el archivo CSV: ${(e as Error).message}` };
    }
// --- 2.5 OBTENER REGLAS DE AUTO-CATEGORIZACIÓN ---
    const { data: rules } = await supabase
        .from('finance_rules')
        .select('pattern, category_id');

    // 3. VALIDACIÓN
    if (transactions.length === 0) {
        return { success: false, error: 'No se pudieron extraer transacciones.' };
    }
    
    // --- 4. APLICAR REGLAS E INSERTAR ---
    let autoCategorizedCount = 0;
    let filteredCount = 0;

    const finalTransactions = transactions
        .filter(t => {
            // 🛡️ Filtro maestro: ignorar cajeros si es tarjeta
            if (isCreditCard) {
                const conceptUpper = t.concept.toUpperCase();
                if (conceptUpper.includes('CAJERO')) {
                    filteredCount++;
                    return false;
                }
            }
            return true;
        })
        .map(t => {
            let category_id = null;
            if (rules && rules.length > 0) {
                const matchingRule = rules.find(rule => 
                    t.concept.toUpperCase().includes(rule.pattern.toUpperCase())
                );
                if (matchingRule) {
                    category_id = matchingRule.category_id;
                    autoCategorizedCount++;
                }
            }
            return {
                ...t,
                account_id: account_id,
                user_id: user_id,
                category_id: category_id,
                created_at: new Date().toISOString(),
                bank_balance:t.bank_balance
            };
        });

    const { error: insertError } = await supabase
      .from('finance_transactions')
      .insert(finalTransactions);
    
    if (insertError) {
      console.error('Error al insertar transacciones:', insertError);
      return { success: false, error: `Error al guardar: ${insertError.message}` };
    }
    
    // 5. Devolver éxito con contadores
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/finance');
    
    return { 
        success: true, 
        transactionsCount: transactions.length,
        autoCategorizedCount: autoCategorizedCount // Devolvemos cuántas se categorizaron solas
    };

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Error interno: ${errorMessage}` };
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

    // 1. Obtener transacción origen y datos de la cuenta destino
    const [{ data: source }, { data: targetAccount }] = await Promise.all([
        supabase.from('finance_transactions').select('*').eq('id', sourceTxId).single(),
        supabase.from('finance_accounts').select('account_type').eq('id', targetAccountId).single()
    ]);

    if (!source || !targetAccount) return { success: false, error: "Datos no encontrados" };

    // 2. Lógica de decisión según tipo de cuenta
    const manualTypes = ['investment', 'loan', 'mortgage', 'other_asset', 'other_liability'];
    const isTargetManual = manualTypes.includes(targetAccount.account_type);

    if (isTargetManual) {
        // --- CASO A: CUENTA MANUAL (Creamos Movimiento Espejo) ---
        // 1. Insertamos el espejo con el transfer_id apuntando al origen
        const { data: mirror, error: mirrorError } = await supabase
            .from('finance_transactions')
            .insert({
                account_id: targetAccountId,
                amount: -source.amount, // Signo contrario
                concept: `VÍNCULO: ${source.concept}`,
                date: source.date,
                category_id: TRANSFER_CAT_ID,
                user_id: user.id,
                transfer_id: source.id // Vínculo A <- B
            })
            .select().single();

        if (mirrorError) return { success: false, error: mirrorError.message };

        // 2. Actualizamos el origen para que apunte al nuevo espejo (Vínculo A -> B)
        await supabase.from('finance_transactions')
            .update({ 
                transfer_id: mirror.id, 
                category_id: TRANSFER_CAT_ID 
            })
            .eq('id', source.id);
            
        revalidatePath('/finance');
        return { success: true, message: "Movimiento espejo creado y vinculado bidireccionalmente" };
    } else {
        // --- CASO B: CUENTA AUTOMÁTICA (Solo categorizamos) ---
        // Aquí no creamos espejo porque llegará por CSV, solo marcamos como transferencia
        await supabase.from('finance_transactions')
            .update({ category_id: TRANSFER_CAT_ID })
            .eq('id', source.id);

        revalidatePath('/finance');
        return { success: true, message: "Categorizado como transferencia. Recuerda conciliar con el espejo cuando lo importes." };
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