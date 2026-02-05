// app/finance/actions/accounts.ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import {ActionResponse } from '@/types/common'
import { FinanceAccountType, FinanceTransactionSplit } from '@/types/finance'; 



type CreateAccountResult = ActionResponse<{ id: string }>;


export async function createAccount(
  _prevState: CreateAccountResult,
  formData: FormData
): Promise<CreateAccountResult> {
  const supabase = await createClient();
  const { revalidatePath } = await import('next/cache');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Usuario no autenticado.' };
  
  const id = formData.get('id');
  const name = formData.get('name') as string;
  const slug = formData.get('slug');
  const accountNumber = (formData.get('account_number') as string) || '';
  const initialBalanceStr = formData.get('initial_balance') as string;// <-- Y aquí
  const accountType = formData.get('account_type');
  const colorTheme = formData.get('color_theme');
  const avatarLetter = formData.get('avatar_letter');
  const isActive = formData.get('is_active') === 'true';
  const autoMirror = formData.get('auto_mirror_transfers') === 'true';
  const importerId = formData.get('importer_id');

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


export async function updateAccount(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    const supabase = await createClient();
    
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const accountNumber = formData.get('account_number') as string;
    const initialBalanceStr = formData.get('initial_balance') as string;

    try {
        const updateData: any = {
            name: name.trim(),
            slug: slug.trim(),
            account_number: accountNumber?.replace(/\s/g, '').trim(), // ✨ Forzamos limpieza de espacios aquí también
            account_type: formData.get('account_type') as any,
            color_theme: formData.get('color_theme') as string,
            avatar_letter: (formData.get('avatar_letter') as string)?.toUpperCase(),
            is_active: formData.get('is_active') === 'true',
            auto_mirror_transfers: formData.get('auto_mirror_transfers') === 'true',
            importer_id: formData.get('importer_id') === 'none' ? null : formData.get('importer_id'),
        };

        if (initialBalanceStr) {
            // Convertimos "1250,50" -> "1250.50" antes de parsear
            updateData.initial_balance = parseFloat(initialBalanceStr.replace(',', '.'));
        }

        const { error } = await supabase.from('finance_accounts').update(updateData).eq('id', id);
        if (error) throw error;

        revalidatePath('/finance');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// DELETE ACCOUNT (Se mantiene igual, es correcta)
export async function deleteAccount(accountId: string): Promise<ActionResponse> {
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