// app/finance/actions.ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { FinanceAccountType, FinanceCategory } from '@/types/finance'; 

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

// ==========================================
// 3. CREATE CATEGORY (Nueva)
// ==========================================

export interface CreateCategoryResult extends ActionResult {
    data?: { id: string, category: FinanceCategory }; // Devolver el objeto categoría
}

export async function createCategory(
    _prevState: ActionResult, // <--- ¡ARGUMENTO AÑADIDO Y TIPADO!
    formData: FormData
): Promise<CreateCategoryResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { revalidatePath } = await import('next/cache');
    
    if (!user) {
        return { success: false, error: 'Acceso denegado.' };
    }

    const name = formData.get('name') as string;
    const isIncomeStr = formData.get('is_income') as string; // 'true' o 'false'
    const parentId = formData.get('parent_id') as string | null;
    const icon = formData.get('icon') as string;

    if (!name) {
        return { success: false, error: 'El nombre de la categoría es obligatorio.' };
    }

    const isIncome = isIncomeStr === 'true';

    try {
        const { data,error } = await supabase
            .from('finance_categories')
            .insert({
                user_id: user.id,
                name: name.trim(),
                is_income: isIncome,
                parent_id: parentId && parentId !== 'no-parent' ? parentId : null,
                icon: icon || null,
            })
            .select('*')
            .single()

        if (error) {
            console.error('Supabase error creating category:', error);
            return { success: false, error: `Error de base de datos: ${error.message}` };
        }

        revalidatePath('/finance');
        return { success: true, 
            data: { id: data.id, category: data as FinanceCategory } };

    } catch (e) {
        console.error('Unexpected error in createCategory:', e);
        return { success: false, error: 'Ocurrió un error inesperado.' };
    }
}

// ==========================================
// 4. UPDATE CATEGORY (Nueva)
// ==========================================
export async function updateCategory(
  _prevState: ActionResult, // <--- ¡AÑADIR ESTE ARGUMENTO!
  formData: FormData
): Promise<ActionResult> {
    const supabase = await createClient();
    const { revalidatePath } = await import('next/cache');

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const icon = formData.get('icon') as string;

    if (!id || !name) {
        return { success: false, error: 'ID y Nombre son obligatorios para actualizar.' };
    }

    try {
        const { error } = await supabase
            .from('finance_categories')
            .update({
                name: name.trim(),
                icon: icon || null,
            })
            .eq('id', id); // RLS asegura que solo el propietario pueda actualizar

        if (error) {
            console.error('Supabase error updating category:', error);
            return { success: false, error: `Error de base de datos: ${error.message}` };
        }

        revalidatePath('/finance');
        return { success: true };

    } catch (e) {
        console.error('Unexpected error in updateCategory:', e);
        return { success: false, error: 'Ocurrió un error inesperado.' };
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
): Promise<{ success: boolean; error?: string; transactionsCount?: number }> {
  
  // Capturar errores generales de Server Action
  try {
    const file = formData.get('file') as File | null;
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
      .select('id')
      .eq('user_id', user_id)
      .limit(1);

    if (accountError || accounts.length === 0) {
      return { success: false, error: 'No se encontró ninguna cuenta de destino.' };
    }
    const account_id = accounts[0].id;
    
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
    
    // 3. VALIDACIÓN E INSERCIÓN
    if (transactions.length === 0) {
        return { success: false, error: 'No se pudieron extraer transacciones. Revisa el delimitador y el mapeo de columnas.' };
    }
    
    // 4. Insertar en la base de datos (mismo código)
    const { error: insertError } = await supabase
      .from('finance_transactions')
      .insert(transactions.map(t => ({
          ...t,
          account_id: account_id,
          user_id: user_id,
          created_at: new Date().toISOString()
      })));
    
    if (insertError) {
      console.error('Error al insertar transacciones:', insertError);
      return { success: false, error: `Error al guardar transacciones: ${insertError.message}` };
    }
    
    // 5. Devolver éxito
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/finance');
    return { success: true, transactionsCount: transactions.length };
  } catch (e) {
    // Captura errores generales de la Server Action
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("ERROR CRÍTICO EN importCsvTransactionsAction:", e);
    return { success: false, error: `Error interno del servidor: ${errorMessage}. Intenta revisar el delimitador.` };
  }
}

// Función auxiliar para mapear una fila CSV a una transacción válida
function mapCsvRow(
  row: { [key: string]: string },
  mapping: ImporterTemplate['mapping'],
  account_id: string,
  user_id: string,
): ParsedTransaction | null {
  
  const { operation_date, concept, amount, sign_column } = mapping;
  
  // 1. Obtener valores crudos
  const rawDate = row[operation_date]?.trim();
  const rawConcept = row[concept]?.trim();
  const rawAmount = row[amount]?.trim().replace(',', '.'); // Reemplazar coma por punto decimal
  const rawSign = sign_column ? row[sign_column]?.trim() : null;

  if (!rawDate || !rawAmount || !rawConcept) {
      // Ignorar filas incompletas o sin mapear
      return null;
  }
  
  let finalAmount: number;
  let numericAmount = parseFloat(rawAmount);

  // 2. Manejar el signo
  if (sign_column && rawSign) {
    // Escenario 1: Hay columna de signo o de tipo (ej: "D" o "C")
    if (rawSign.toLowerCase().includes('d') || rawSign.includes('-')) {
        finalAmount = -Math.abs(numericAmount); // Convertir a negativo (Gasto)
    } else {
        finalAmount = Math.abs(numericAmount); // Mantener positivo (Ingreso)
    }
  } else {
    // Escenario 2: El importe es positivo/negativo en una sola columna
    finalAmount = numericAmount;
  }
  
  // 3. Formatear fecha (simplificado, esto puede ser un punto de fallo si el formato es raro)
  let dateForDb = rawDate;
  
  // Si la fecha es dd/mm/yyyy, la convertimos a yyyy-mm-dd
  const dateParts = rawDate.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dateParts) {
    const [, day, month, year] = dateParts;
    // Esto asume que el formato es dd/mm/yyyy
    dateForDb = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }


  // 4. Devolver la transacción parseada
  return {
    date: dateForDb,
    amount: finalAmount,
    concept: rawConcept,
    importer_notes: `Importado de CSV: ${rawDate}`,
  };
}